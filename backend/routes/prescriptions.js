const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/prescriptions';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'prescription-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only image files and PDFs
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/pdf'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload prescription for an order
router.post('/upload/:orderId', authenticateToken, upload.array('prescriptions', 5), async (req, res) => {
  try {
    const { orderId } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Verify order belongs to the customer
    const [orders] = await db.execute(
      'SELECT id, customer_id, status FROM orders WHERE id = ? AND customer_id = ?',
      [orderId, req.user.id]
    );

    if (orders.length === 0) {
      // Clean up uploaded files
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orders[0];

    // Check if order is in correct status
    if (!['pending', 'prescription_pending'].includes(order.status)) {
      // Clean up uploaded files
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(400).json({ message: 'Cannot upload prescriptions for this order status' });
    }

    // Save prescription records to database
    const prescriptions = [];
    for (const file of files) {
      const [result] = await db.execute(
        'INSERT INTO prescriptions (order_id, file_name, file_path, file_size, mime_type) VALUES (?, ?, ?, ?, ?)',
        [orderId, file.originalname, file.path, file.size, file.mimetype]
      );
      
      prescriptions.push({
        id: result.insertId,
        file_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        uploaded_at: new Date()
      });
    }

    // Update order status to prescription_pending
    await db.execute(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      ['prescription_pending', orderId]
    );

    res.json({
      message: 'Prescriptions uploaded successfully',
      prescriptions: prescriptions
    });

  } catch (error) {
    console.error('Prescription upload error:', error);
    
    // Clean up files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get prescriptions for an order
router.get('/order/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Verify user has access to this order
    let query, params;
    if (req.user.role === 'customer') {
      query = 'SELECT id FROM orders WHERE id = ? AND customer_id = ?';
      params = [orderId, req.user.id];
    } else if (['pharmacist', 'branch_manager'].includes(req.user.role)) {
      query = 'SELECT id FROM orders WHERE id = ?';
      params = [orderId];
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [orders] = await db.execute(query, params);
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get prescriptions for the order
    const [prescriptions] = await db.execute(
      'SELECT id, file_name, file_size, mime_type, uploaded_at FROM prescriptions WHERE order_id = ? ORDER BY uploaded_at DESC',
      [orderId]
    );

    res.json({ prescriptions });

  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Download prescription file
router.get('/download/:prescriptionId', authenticateToken, async (req, res) => {
  try {
    const { prescriptionId } = req.params;

    // Get prescription details
    const [prescriptions] = await db.execute(
      'SELECT p.*, o.customer_id FROM prescriptions p JOIN orders o ON p.order_id = o.id WHERE p.id = ?',
      [prescriptionId]
    );

    if (prescriptions.length === 0) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    const prescription = prescriptions[0];

    // Check access permissions
    if (req.user.role === 'customer' && prescription.customer_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    } else if (!['customer', 'pharmacist', 'branch_manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(prescription.file_path)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Send file
    res.setHeader('Content-Disposition', `attachment; filename="${prescription.file_name}"`);
    res.setHeader('Content-Type', prescription.mime_type);
    res.sendFile(path.resolve(prescription.file_path));

  } catch (error) {
    console.error('Download prescription error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete prescription (customer only, before validation)
router.delete('/:prescriptionId', authenticateToken, async (req, res) => {
  try {
    const { prescriptionId } = req.params;

    // Get prescription and order details
    const [prescriptions] = await db.execute(
      'SELECT p.*, o.customer_id, o.status FROM prescriptions p JOIN orders o ON p.order_id = o.id WHERE p.id = ?',
      [prescriptionId]
    );

    if (prescriptions.length === 0) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    const prescription = prescriptions[0];

    // Only customer can delete their own prescriptions
    if (req.user.role !== 'customer' || prescription.customer_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Can only delete if order is still pending validation
    if (!['pending', 'prescription_pending'].includes(prescription.status)) {
      return res.status(400).json({ message: 'Cannot delete prescription after validation has started' });
    }

    // Delete file from filesystem
    if (fs.existsSync(prescription.file_path)) {
      fs.unlinkSync(prescription.file_path);
    }

    // Delete from database
    await db.execute('DELETE FROM prescriptions WHERE id = ?', [prescriptionId]);

    res.json({ message: 'Prescription deleted successfully' });

  } catch (error) {
    console.error('Delete prescription error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
