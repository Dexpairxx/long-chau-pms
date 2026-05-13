const express = require('express');
const router = express.Router();
const { productImageUpload, prescriptionImageUpload } = require('../middleware/upload');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Upload product image (Branch Manager only)
router.post('/product-image', authenticateToken, authorizeRoles('branch_manager'), (req, res) => {
  productImageUpload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ 
        message: err.message || 'File upload failed' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        message: 'No file uploaded' 
      });
    }

    // Return the relative path that can be used in the frontend
    const imagePath = `/uploads/products/${req.file.filename}`;
    
    res.json({
      message: 'Image uploaded successfully',
      imagePath: imagePath,
      filename: req.file.filename
    });
  });
});

// Upload prescription image (Pharmacist and above)
router.post('/prescription-image', authenticateToken, authorizeRoles('pharmacist', 'branch_manager'), (req, res) => {
  prescriptionImageUpload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ 
        message: err.message || 'File upload failed' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        message: 'No file uploaded' 
      });
    }

    // Return the relative path that can be used in the frontend
    const imagePath = `/uploads/prescriptions/${req.file.filename}`;
    
    res.json({
      message: 'Prescription image uploaded successfully',
      imagePath: imagePath,
      filename: req.file.filename
    });
  });
});

module.exports = router;
