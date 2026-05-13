const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get user's cart items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [cartItems] = await db.execute(`
      SELECT 
        ci.id,
        ci.product_id,
        ci.quantity,
        p.name,
        p.description,
        p.price,
        p.image_url,
        p.requires_prescription,
        c.name as category_name,
        (ci.quantity * p.price) as subtotal
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ci.user_id = ? AND p.status = 'active'
      ORDER BY ci.created_at DESC
    `, [userId]);

    const total = cartItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);

    res.json({
      success: true,
      cartItems,
      total: total.toFixed(2),
      count: cartItems.length
    });

  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Failed to fetch cart' });
  }
});

// Add item to cart
router.post('/add', [
  authenticateToken,
  body('product_id').isInt({ min: 1 }),
  body('quantity').isInt({ min: 1, max: 10000 }) // Set maximum quantity limit
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { product_id, quantity } = req.body;

    // Define maximum allowed quantity per product in cart
    const MAX_CART_QUANTITY = 10000;

    // Additional server-side validation for quantity limit
    if (quantity > MAX_CART_QUANTITY) {
      return res.status(400).json({ 
        message: `Maximum quantity per product is ${MAX_CART_QUANTITY}`,
        maxQuantity: MAX_CART_QUANTITY
      });
    }

    // Check if product exists and is active
    const [products] = await db.execute(
      'SELECT id, name, status FROM products WHERE id = ?',
      [product_id]
    );

    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = products[0];
    if (product.status !== 'active') {
      return res.status(400).json({ message: 'Product is not available' });
    }

    // Check if item already exists in cart
    const [existingItems] = await db.execute(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    );

    if (existingItems.length > 0) {
      // Update quantity with limit check
      const newQuantity = existingItems[0].quantity + quantity;
      
      // Check if new quantity exceeds maximum limit
      if (newQuantity > MAX_CART_QUANTITY) {
        return res.status(400).json({ 
          message: `Adding ${quantity} would exceed maximum quantity limit of ${MAX_CART_QUANTITY} for this product`,
          currentQuantity: existingItems[0].quantity,
          maxQuantity: MAX_CART_QUANTITY,
          maxAddable: MAX_CART_QUANTITY - existingItems[0].quantity
        });
      }
      
      await db.execute(
        'UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newQuantity, existingItems[0].id]
      );
    } else {
      // Add new item
      await db.execute(
        'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [userId, product_id, quantity]
      );
    }

    res.json({ 
      success: true, 
      message: `Added ${quantity} ${product.name} to cart` 
    });

  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Failed to add item to cart' });
  }
});

// Update cart item quantity
router.put('/update/:id', [
  authenticateToken,
  body('quantity').isInt({ min: 1, max: 10000 }) // Set maximum quantity limit
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const cartItemId = req.params.id;
    const { quantity } = req.body;

    // Define maximum allowed quantity per product in cart
    const MAX_CART_QUANTITY = 10000;

    // Additional server-side validation for quantity limit
    if (quantity > MAX_CART_QUANTITY) {
      return res.status(400).json({ 
        message: `Maximum quantity per product is ${MAX_CART_QUANTITY}`,
        maxQuantity: MAX_CART_QUANTITY
      });
    }

    // Check if cart item belongs to user
    const [cartItems] = await db.execute(`
      SELECT ci.id, ci.product_id, p.name
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.id = ? AND ci.user_id = ?
    `, [cartItemId, userId]);

    if (cartItems.length === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    const cartItem = cartItems[0];

    await db.execute(
      'UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [quantity, cartItemId]
    );

    res.json({ 
      success: true, 
      message: `Updated ${cartItem.name} quantity to ${quantity}` 
    });

  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ message: 'Failed to update cart item' });
  }
});

// Remove item from cart
router.delete('/remove/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const cartItemId = req.params.id;

    // Check if cart item belongs to user
    const [cartItems] = await db.execute(
      'SELECT id FROM cart_items WHERE id = ? AND user_id = ?',
      [cartItemId, userId]
    );

    if (cartItems.length === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    await db.execute('DELETE FROM cart_items WHERE id = ?', [cartItemId]);

    res.json({ 
      success: true, 
      message: 'Item removed from cart' 
    });

  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({ message: 'Failed to remove cart item' });
  }
});

// Clear entire cart
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await db.execute('DELETE FROM cart_items WHERE user_id = ?', [userId]);

    res.json({ 
      success: true, 
      message: 'Cart cleared successfully' 
    });

  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ message: 'Failed to clear cart' });
  }
});

module.exports = router;
