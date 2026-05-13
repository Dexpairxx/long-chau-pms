const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all products
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      ORDER BY p.created_at DESC
    `;
    
    const [products] = await db.execute(query);
    
    // Hide stock quantity from customers
    if (req.user.role === 'customer') {
      products.forEach(product => {
        delete product.stock_quantity;
      });
    }

    res.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get product by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [products] = await db.execute(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ?
    `, [req.params.id]);

    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = products[0];
    
    // Hide stock quantity from customers
    if (req.user.role === 'customer') {
      delete product.stock_quantity;
    }

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new product (Branch Manager only)
router.post('/', authenticateToken, authorizeRoles('branch_manager'), [
  body('name').trim().isLength({ min: 2 }),
  body('price').isFloat({ min: 0 }),
  body('stock_quantity').isInt({ min: 0 }),
  body('category_id').optional().isInt(),
  body('requires_prescription').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      name, 
      description, 
      category_id, 
      price, 
      stock_quantity, 
      requires_prescription = false,
      image_url
    } = req.body;

    const [result] = await db.execute(
      'INSERT INTO products (name, description, category_id, price, stock_quantity, requires_prescription, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, description, category_id || null, price, stock_quantity, requires_prescription, image_url || null]
    );

    res.status(201).json({ 
      message: 'Product created successfully',
      productId: result.insertId 
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update product (Branch Manager only)
router.put('/:id', authenticateToken, authorizeRoles('branch_manager'), [
  body('name').optional().trim().isLength({ min: 2 }),
  body('price').optional().isFloat({ min: 0 }),
  body('stock_quantity').optional().isInt({ min: 0 }),
  body('category_id').optional().isInt(),
  body('requires_prescription').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      name, 
      description, 
      category_id, 
      price, 
      stock_quantity, 
      requires_prescription,
      image_url,
      status
    } = req.body;

    // Build dynamic update query based on provided fields
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (category_id !== undefined) {
      updateFields.push('category_id = ?');
      updateValues.push(category_id);
    }
    if (price !== undefined) {
      updateFields.push('price = ?');
      updateValues.push(price);
    }
    if (stock_quantity !== undefined) {
      updateFields.push('stock_quantity = ?');
      updateValues.push(stock_quantity);
    }
    if (requires_prescription !== undefined) {
      updateFields.push('requires_prescription = ?');
      updateValues.push(requires_prescription);
    }
    if (image_url !== undefined) {
      updateFields.push('image_url = ?');
      updateValues.push(image_url);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    // Always update the timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    
    const query = `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`;
    updateValues.push(req.params.id);

    const [result] = await db.execute(query, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product updated successfully' });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete product (Branch Manager only)
router.delete('/:id', authenticateToken, authorizeRoles('branch_manager'), async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM products WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all categories
router.get('/categories/all', authenticateToken, async (req, res) => {
  try {
    const [categories] = await db.execute('SELECT * FROM categories ORDER BY name');
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update stock quantity (Branch Manager and Cashier)
router.patch('/:id/stock', authenticateToken, authorizeRoles('branch_manager', 'cashier'), [
  body('stock_quantity').isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { stock_quantity } = req.body;

    const [result] = await db.execute(
      'UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [stock_quantity, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Stock quantity updated successfully' });

  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
