const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const nodemailer = require('nodemailer');

const router = express.Router();

// Email configuration
let transporter = null;
try {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
} catch (error) {
  console.log('Email configuration not available, emails will be skipped');
}

// Get all orders (for cashier and branch manager)
router.get('/all', authenticateToken, authorizeRoles('cashier', 'branch_manager'), async (req, res) => {
  try {
    // Get orders with customer information
    const [orders] = await db.execute(`
      SELECT 
        o.*,
        u.full_name as customer_full_name,
        u.email as customer_email,
        u.phone as customer_phone,
        c.full_name as cashier_name
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN users c ON o.cashier_id = c.id
      ORDER BY o.created_at DESC
    `);

    // Get order items for each order
    for (let order of orders) {
      const [items] = await db.execute(`
        SELECT oi.*, p.name as product_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);

      order.items = items;
    }

    res.json({
      success: true,
      orders: orders
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// Create order from cart
router.post('/create', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can create orders' });
    }

    // Get user's cart items
    const [cartItems] = await db.execute(`
      SELECT ci.*, p.name, p.price, p.requires_prescription, p.stock_quantity
      FROM cart_items ci 
      JOIN products p ON ci.product_id = p.id 
      WHERE ci.user_id = ?
    `, [req.user.id]);

    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Calculate total amount and validate stock
    let totalAmount = 0;
    let requiresPrescription = false;
    const stockErrors = [];

    for (const item of cartItems) {
      totalAmount += item.price * item.quantity;
      if (item.requires_prescription) {
        requiresPrescription = true;
      }
      
      // Check stock availability
      if (item.stock_quantity < item.quantity) {
        stockErrors.push({
          product: item.name,
          requested: item.quantity,
          available: item.stock_quantity
        });
      }
    }

    // If there are stock errors, return them
    if (stockErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Insufficient stock for some items',
        stockErrors: stockErrors
      });
    }

    // Get a connection and start transaction
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Create order
      const orderStatus = requiresPrescription ? 'pending' : 'payment_pending';
      const [orderResult] = await connection.execute(
        'INSERT INTO orders (customer_id, order_type, total_amount, status) VALUES (?, ?, ?, ?)',
        [req.user.id, 'online', totalAmount, orderStatus]
      );

      const orderId = orderResult.insertId;

      // Create order items
      for (const item of cartItems) {
        await connection.execute(
          'INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
          [orderId, item.product_id, item.quantity, item.price, item.price * item.quantity]
        );

        // Update product stock
        await connection.execute(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      // Clear cart
      await connection.execute('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);

      // Commit transaction
      await connection.commit();

      // Send email notification
      if (transporter) {
        try {
          await sendOrderConfirmationEmail(req.user.email, req.user.full_name, orderId, totalAmount, requiresPrescription);
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          // Don't fail the order if email fails
        }
      } else {
        console.log('Email not configured, skipping order confirmation email');
      }

      res.status(201).json({
        message: 'Order created successfully',
        orderId: orderId,
        totalAmount: totalAmount,
        requiresPrescription: requiresPrescription,
        status: orderStatus
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get customer's orders
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [orders] = await db.execute(`
      SELECT o.*, 
             COALESCE(pc.prescription_count, 0) as prescription_count,
             CASE WHEN rp.has_prescription_items > 0 THEN 1 ELSE 0 END as has_prescription_items,
             GROUP_CONCAT(
               CONCAT(oi.quantity, 'x ', pr.name) 
               ORDER BY pr.name SEPARATOR ', '
             ) as items_summary
      FROM orders o 
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products pr ON oi.product_id = pr.id
      LEFT JOIN (
        SELECT order_id, COUNT(*) as prescription_count 
        FROM prescriptions 
        GROUP BY order_id
      ) pc ON o.id = pc.order_id
      LEFT JOIN (
        SELECT o.id as order_id, COUNT(CASE WHEN pr.requires_prescription = 1 THEN 1 END) as has_prescription_items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products pr ON oi.product_id = pr.id
        GROUP BY o.id
      ) rp ON o.id = rp.order_id
      WHERE o.customer_id = ? 
      GROUP BY o.id, pc.prescription_count, rp.has_prescription_items
      ORDER BY o.created_at DESC
    `, [req.user.id]);

    res.json({ orders });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get orders pending prescription validation (pharmacist only)
router.get('/pending-validation', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'pharmacist') {
      return res.status(403).json({ message: 'Access denied. Pharmacist role required.' });
    }

    const [orders] = await db.execute(`
      SELECT o.*, u.full_name as customer_name, u.email as customer_email,
             COALESCE(pc.prescription_count, 0) as prescription_count,
             GROUP_CONCAT(
               CONCAT(oi.quantity, 'x ', pr.name) 
               ORDER BY pr.name SEPARATOR ', '
             ) as items_summary
      FROM orders o 
      JOIN users u ON o.customer_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products pr ON oi.product_id = pr.id
      LEFT JOIN (
        SELECT order_id, COUNT(*) as prescription_count 
        FROM prescriptions 
        GROUP BY order_id
      ) pc ON o.id = pc.order_id
      WHERE o.status = 'prescription_pending'
      GROUP BY o.id, pc.prescription_count
      ORDER BY o.created_at ASC
    `);

    res.json({ orders });

  } catch (error) {
    console.error('Get pending validation orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Validate prescription (approve/reject)
router.post('/validate/:orderId', [
  body('action').isIn(['approve', 'reject']),
  body('notes').optional().trim()
], authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'pharmacist') {
      return res.status(403).json({ message: 'Access denied. Pharmacist role required.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId } = req.params;
    const { action, notes } = req.body;

    // Get order details
    const [orders] = await db.execute(`
      SELECT o.*, u.full_name as customer_name, u.email as customer_email
      FROM orders o 
      JOIN users u ON o.customer_id = u.id
      WHERE o.id = ? AND o.status = 'prescription_pending'
    `, [orderId]);

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found or not pending validation' });
    }

    const order = orders[0];
    const newStatus = action === 'approve' ? 'prescription_approved' : 'prescription_rejected';

    // If rejecting prescription, restore stock
    if (action === 'reject') {
      // Get order items to restore stock
      const [orderItems] = await db.execute(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [orderId]
      );

      // Restore product stock
      for (const item of orderItems) {
        await db.execute(
          'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
    }

    // Update order
    await db.execute(
      'UPDATE orders SET status = ?, prescription_validated_by = ?, prescription_validated_at = NOW(), prescription_notes = ? WHERE id = ?',
      [newStatus, req.user.id, notes, orderId]
    );

    // Send email notification
    if (transporter) {
      try {
        await sendValidationResultEmail(
          order.customer_email,
          order.customer_name,
          orderId,
          action === 'approve',
          notes
        );
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }
    } else {
      console.log('Email not configured, skipping validation result email');
    }

    res.json({
      message: `Prescription ${action}d successfully`,
      orderId: orderId,
      status: newStatus
    });

  } catch (error) {
    console.error('Validate prescription error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get order details
router.get('/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Build query based on user role
    let query, params;

    if (req.user.role === 'customer') {
      query = `
        SELECT o.*, u.full_name as customer_name, 
               pv.full_name as pharmacist_name
        FROM orders o 
        JOIN users u ON o.customer_id = u.id
        LEFT JOIN users pv ON o.prescription_validated_by = pv.id
        WHERE o.id = ? AND o.customer_id = ?
      `;
      params = [orderId, req.user.id];
    } else if (['pharmacist', 'branch_manager'].includes(req.user.role)) {
      query = `
        SELECT o.*, u.full_name as customer_name, u.email as customer_email,
               pv.full_name as pharmacist_name
        FROM orders o 
        JOIN users u ON o.customer_id = u.id
        LEFT JOIN users pv ON o.prescription_validated_by = pv.id
        WHERE o.id = ?
      `;
      params = [orderId];
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [orders] = await db.execute(query, params);

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get order items
    const [orderItems] = await db.execute(`
      SELECT oi.*, p.name as product_name, p.requires_prescription
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    // Get prescriptions
    const [prescriptions] = await db.execute(
      'SELECT id, file_name, file_size, mime_type, uploaded_at FROM prescriptions WHERE order_id = ?',
      [orderId]
    );

    res.json({
      order: orders[0],
      items: orderItems,
      prescriptions: prescriptions
    });

  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Email helper functions
async function sendOrderConfirmationEmail(email, customerName, orderId, totalAmount, requiresPrescription) {
  if (!transporter) {
    console.log('Email transporter not configured');
    return;
  }

  const subject = `Order Confirmation - Long Chau Pharmacy`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #062e92;">Order Confirmation</h2>
      <p>Dear ${customerName},</p>
      <p>Thank you for your order with Long Chau Pharmacy.</p>
      <p><strong>Order Details:</strong></p>
      <ul>
        <li>Total Amount: $${totalAmount.toFixed(2)}</li>
        <li>Status: ${requiresPrescription ? 'Pending Prescription Validation' : 'Payment Pending'}</li>
      </ul>
      ${requiresPrescription ?
        '<p><strong>Important:</strong> Your order contains prescription medications. Please upload your prescription(s) in the Order Status page to proceed with validation.</p>' :
        '<p>Your order is ready for payment. You can proceed to checkout in your account.</p>'
      }
      <p>You can track your order status in your account.</p>
      <p>Thank you for choosing Long Chau Pharmacy!</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@longchau.com',
    to: email,
    subject: subject,
    html: html
  });
}

async function sendValidationResultEmail(email, customerName, orderId, approved, notes) {
  if (!transporter) {
    console.log('Email transporter not configured');
    return;
  }

  const subject = `Prescription ${approved ? 'Approved' : 'Rejected'} - Long Chau Pharmacy`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #062e92;">Prescription Validation Result</h2>
      <p>Dear ${customerName},</p>
      <p>Your prescription has been ${approved ? 'approved' : 'rejected'} by our pharmacist.</p>
      ${approved ?
      '<p><strong>Good news!</strong> Your prescription has been approved. You can now proceed to payment and checkout.</p>' :
      '<p><strong>Unfortunately,</strong> your prescription could not be approved. Please contact us for more information or submit a new prescription.</p>'
    }
      ${notes ? `<p><strong>Pharmacist Notes:</strong> ${notes}</p>` : ''}
      <p>Please visit your account to view the order details and take next steps.</p>
      <p>Thank you for choosing Long Chau Pharmacy!</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@longchau.com',
    to: email,
    subject: subject,
    html: html
  });
}

// Send payment confirmation email
async function sendPaymentConfirmationEmail(order, paymentDetails) {
  const subject = `Payment Confirmed - Long Chau Pharmacy`;

  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #062e92;">Payment Confirmed!</h2>
    <p>Dear ${order.customer_name},</p>
    
    <p>Your payment has been successfully processed.</p>
    
    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3>Order Summary</h3>
      <p><strong>Order Total:</strong> $${parseFloat(order.total_amount).toFixed(2)}</p>
      <p><strong>Delivery Fee:</strong> $${paymentDetails.delivery_fee.toFixed(2)}</p>
      <p><strong>Final Total:</strong> $${paymentDetails.final_total.toFixed(2)}</p>
      
      <h3>Payment Details</h3>
      <p><strong>Payment Method:</strong> ${paymentDetails.payment_method.replace('_', ' ').toUpperCase()}</p>
      <p><strong>Payment Reference:</strong> ${paymentDetails.payment_reference}</p>
      
      <h3>Delivery Information</h3>
      <p><strong>Delivery Method:</strong> ${paymentDetails.delivery_method.replace('_', ' ').toUpperCase()}</p>
      ${paymentDetails.delivery_address ? `<p><strong>Delivery Address:</strong> ${paymentDetails.delivery_address}</p>` : ''}
    </div>
    
    <p>Your order is now being prepared. You will receive updates on the delivery status.</p>
    
    <p>Thank you for choosing Long Chau Pharmacy!</p>
    
  </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@longchau.com',
    to: order.customer_email,
    subject: subject,
    html: html
  });
}

// Process payment for approved order
router.post('/payment/:orderId', [
  body('payment_method').isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer']),
  body('delivery_method').isIn(['pickup', 'home_delivery', 'express_delivery']),
  body('delivery_address').optional().trim(),
  body('delivery_notes').optional().trim()
], authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can process payments' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId } = req.params;
    const { payment_method, delivery_method, delivery_address, delivery_notes } = req.body;

    // Get order details
    const [orders] = await db.execute(`
      SELECT o.*, u.full_name as customer_name, u.email as customer_email
      FROM orders o 
      JOIN users u ON o.customer_id = u.id
      WHERE o.id = ? AND o.customer_id = ? AND (o.status = 'prescription_approved' OR o.status = 'payment_pending')
    `, [orderId, req.user.id]);

    if (orders.length === 0) {
      return res.status(404).json({
        message: 'Order not found or not ready for payment. Orders must have approved prescription or be payment-ready.'
      });
    }

    const order = orders[0];

    // Validate delivery address for delivery methods
    if (['home_delivery', 'express_delivery'].includes(delivery_method) && !delivery_address) {
      return res.status(400).json({
        message: 'Delivery address is required for home/express delivery'
      });
    }

    // Calculate delivery fee
    const deliveryFees = {
      'pickup': 0,
      'home_delivery': 5.00,
      'express_delivery': 15.00
    };
    const deliveryFee = deliveryFees[delivery_method];
    const finalTotal = parseFloat(order.total_amount) + deliveryFee;

    // Simulate payment processing (always successful for demo)
    const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Update order with payment details
    await db.execute(`
      UPDATE orders SET 
        status = 'paid',
        payment_status = 'completed',
        payment_method = ?,
        delivery_method = ?,
        delivery_address = ?,
        delivery_notes = ?,
        delivery_fee = ?,
        final_total = ?,
        payment_reference = ?,
        paid_at = NOW()
      WHERE id = ?
    `, [
      payment_method,
      delivery_method,
      delivery_address || null,
      delivery_notes || null,
      deliveryFee,
      finalTotal,
      paymentReference,
      orderId
    ]);

    // Send payment confirmation email
    if (transporter) {
      try {
        await sendPaymentConfirmationEmail(order, {
          payment_method,
          delivery_method,
          delivery_address,
          delivery_fee: deliveryFee,
          final_total: finalTotal,
          payment_reference: paymentReference
        });
      } catch (emailError) {
        console.error('Payment confirmation email failed:', emailError);
      }
    }

    res.json({
      message: 'Payment processed successfully',
      orderId: orderId,
      payment_reference: paymentReference,
      final_total: finalTotal,
      delivery_fee: deliveryFee
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ message: 'Payment processing failed' });
  }
});

// Create in-store order (cashier only)
router.post('/in-store', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'cashier') {
      return res.status(403).json({ message: 'Only cashiers can create in-store orders' });
    }

    const {
      customer_info,
      order_type = 'in_store',
      total_amount,
      status = 'completed',
      payment_method = 'cash',
      payment_status = 'completed',
      delivery_method = 'pickup',
      delivery_fee = 0,
      final_total,
      notes = '',
      items
    } = req.body;

    // Validate required fields
    if (!customer_info || !customer_info.full_name || !items || items.length === 0) {
      return res.status(400).json({ message: 'Customer name and items are required' });
    }

    // Validate stock availability and calculate total
    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const { product_id, quantity, unit_price } = item;

      // Get current product info
      const [products] = await db.execute(
        'SELECT id, name, price, stock_quantity, status FROM products WHERE id = ?',
        [product_id]
      );

      if (products.length === 0) {
        return res.status(404).json({ message: `Product with ID ${product_id} not found` });
      }

      const product = products[0];

      if (product.status !== 'active') {
        return res.status(400).json({ message: `Product ${product.name} is not available` });
      }

      if (product.stock_quantity < quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}, Requested: ${quantity}`
        });
      }

      // Verify unit price matches current price
      if (Math.abs(product.price - unit_price) > 0.01) {
        return res.status(400).json({
          message: `Price mismatch for ${product.name}. Current price: ${product.price}`
        });
      }

      const itemTotal = quantity * unit_price;
      calculatedTotal += itemTotal;

      validatedItems.push({
        product_id,
        quantity,
        unit_price,
        total_price: itemTotal,
        product_name: product.name
      });
    }

    // Verify calculated total matches provided total
    if (Math.abs(calculatedTotal - total_amount) > 0.01) {
      return res.status(400).json({
        message: `Total amount mismatch. Calculated: ${calculatedTotal}, Provided: ${total_amount}`
      });
    }

    // Get a connection and begin transaction
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Create order with customer info
      const [orderResult] = await connection.execute(`
        INSERT INTO orders (
          customer_name, customer_email, customer_phone, cashier_id,
          order_type, total_amount, status, 
          payment_method, payment_status, delivery_method, 
          delivery_fee, final_total, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        customer_info.full_name,
        customer_info.email || null,
        customer_info.phone || null,
        req.user.id,
        order_type, total_amount, status,
        payment_method, payment_status, delivery_method,
        delivery_fee, final_total || total_amount, notes
      ]);

      const orderId = orderResult.insertId;

      // Create order items and update stock
      for (const item of validatedItems) {
        // Insert order item
        await connection.execute(`
          INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
          VALUES (?, ?, ?, ?, ?)
        `, [orderId, item.product_id, item.quantity, item.unit_price, item.total_price]);

        // Update product stock
        await connection.execute(`
          UPDATE products 
          SET stock_quantity = stock_quantity - ? 
          WHERE id = ?
        `, [item.quantity, item.product_id]);
      }

      // Commit transaction
      await connection.commit();

      // Get the complete order details
      const [orderDetails] = await db.execute(`
        SELECT o.*, c.full_name as cashier_name
        FROM orders o
        JOIN users c ON o.cashier_id = c.id
        WHERE o.id = ?
      `, [orderId]);

      const [orderItems] = await db.execute(`
        SELECT oi.*, p.name as product_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [orderId]);

      const order = {
        ...orderDetails[0],
        items: orderItems
      };

      res.status(201).json({
        message: 'In-store order created successfully',
        id: orderId,
        order: order
      });

    } catch (error) {
      // Rollback transaction
      await connection.rollback();
      throw error;
    } finally {
      // Release connection
      connection.release();
    }

  } catch (error) {
    console.error('Error creating in-store order:', error);
    res.status(500).json({
      message: 'Failed to create in-store order',
      error: error.message
    });
  }
});

// Send promotion email function
async function sendPromotionEmail(email, customerName, subject, content) {
  if (!transporter) {
    console.log(`Promotion email to: ${customerName} (${email})`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${content.substring(0, 100)}...`);
    return { success: true, messageId: 'simulated_' + Date.now(), simulated: true };
  }

  try {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9;">
      <h2 style="color: #062e92;">${subject}</h2>
      <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
        <p style="font-size: 16px; margin-bottom: 20px;">Dear ${customerName},</p>
        <div style="white-space: pre-wrap; font-size: 16px; line-height: 1.6; margin: 20px 0;">
        ${content}
        </div>
        <p style="margin-top: 30px;">Thank you for being a valued customer!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://nhathuoclongchau.com.vn" style="display: inline-block; background: #062e92; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Visit Our Store</a>
        </div>
      </div>
    </div>
    `;

    const result = await transporter.sendMail({
      from: {
        name: 'Long Chau Pharmacy',
        address: process.env.SMTP_FROM || process.env.SMTP_USER
      },
      to: {
        name: customerName,
        address: email
      },
      subject: subject,
      text: content,
      html: html
    });

    console.log(`Promotion email sent to ${customerName} (${email})`);
    return { success: true, messageId: result.messageId, simulated: false };

  } catch (error) {
    console.error(`Failed to send promotion email to ${email}:`, error.message);
    throw error;
  }
}

// Update order status (for customers deleting prescriptions)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'prescription_pending', 'payment_pending', 'prescription_approved', 'prescription_rejected', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Check if order exists and belongs to user (for customers) or allow all (for staff)
    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE id = ? AND (customer_id = ? OR ? IN ("cashier", "pharmacist", "branch_manager"))',
      [orderId, req.user.id, req.user.role]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found or access denied' });
    }

    const currentOrder = orders[0];
    const currentStatus = currentOrder.status;

    // Get a connection and start transaction for stock restoration
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Check if we need to restore stock (when cancelling or rejecting orders)
      const needsStockRestoration = (status === 'cancelled' || status === 'prescription_rejected') 
        && !['cancelled', 'prescription_rejected', 'delivered'].includes(currentStatus);

      if (needsStockRestoration) {
        // Get order items to restore stock
        const [orderItems] = await connection.execute(
          'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
          [orderId]
        );

        // Restore stock for each item
        for (const item of orderItems) {
          await connection.execute(
            'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
        }
      }

      // Update order status
      await connection.execute(
        'UPDATE orders SET status = ? WHERE id = ?',
        [status, orderId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Order status updated successfully',
        orderId: orderId,
        newStatus: status,
        stockRestored: needsStockRestoration
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete order (for customers with pending orders)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;

    // Check if order exists and belongs to user
    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE id = ? AND customer_id = ?',
      [orderId, req.user.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found or access denied' });
    }

    const order = orders[0];

    // Only allow deletion of orders in specific statuses
    const deletableStatuses = ['pending', 'prescription_pending', 'payment_pending'];
    if (!deletableStatuses.includes(order.status)) {
      return res.status(400).json({ 
        message: 'Order cannot be deleted. Only pending orders can be deleted.' 
      });
    }

    // Start transaction
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get order items to restore stock
      const [orderItems] = await connection.execute(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [orderId]
      );

      // Restore product stock
      for (const item of orderItems) {
        await connection.execute(
          'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      // Delete prescriptions files (if any)
      await connection.execute('DELETE FROM prescriptions WHERE order_id = ?', [orderId]);
      
      // Delete order items
      await connection.execute('DELETE FROM order_items WHERE order_id = ?', [orderId]);
      
      // Delete order
      await connection.execute('DELETE FROM orders WHERE id = ?', [orderId]);

      await connection.commit();

      res.json({
        success: true,
        message: 'Order deleted successfully'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Export the promotion email function for use in other routes
module.exports = router;
module.exports.sendPromotionEmail = sendPromotionEmail;