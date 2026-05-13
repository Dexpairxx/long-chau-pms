const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all users (for staff management - branch manager only)
router.get('/', authenticateToken, authorizeRoles('branch_manager'), async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, email, full_name, phone, role, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get only staff members (exclude customers, no ID for security)
router.get('/staff', authenticateToken, async (req, res) => {
  try {
    const [staff] = await db.execute(
      `SELECT email, full_name, role, phone, created_at 
       FROM users 
       WHERE role IN ('cashier', 'pharmacist', 'branch_manager')
       ORDER BY 
         CASE role 
           WHEN 'branch_manager' THEN 1
           WHEN 'pharmacist' THEN 2
           WHEN 'cashier' THEN 3
         END,
         full_name ASC`
    );
    
    res.json({
      success: true,
      staff
    });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff data'
    });
  }
});

// Create staff account (branch manager only)
router.post('/staff', authenticateToken, authorizeRoles('branch_manager'), [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('full_name').trim().isLength({ min: 2 }),
  body('role').isIn(['cashier', 'pharmacist', 'branch_manager']),
  body('phone').optional().isMobilePhone()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, full_name, role, phone } = req.body;

    // Check if user already exists
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create staff user
    const [result] = await db.execute(
      'INSERT INTO users (email, password, full_name, phone, role) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, full_name, phone, role]
    );

    res.status(201).json({ 
      message: 'Staff account created successfully',
      userId: result.insertId 
    });

  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user status (branch manager only)
router.patch('/:id/status', authenticateToken, authorizeRoles('branch_manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await db.execute(
      'UPDATE users SET status = ? WHERE id = ?',
      [status, id]
    );

    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get customers for promotion (branch manager only)
router.get('/customers', authenticateToken, authorizeRoles('branch_manager'), async (req, res) => {
  try {
    const [customers] = await db.execute(
      'SELECT id, email, full_name, created_at FROM users WHERE role = "customer" ORDER BY created_at DESC'
    );

    res.json({ customers });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get customers for in-store orders (cashier only)
router.get('/customers/in-store', authenticateToken, authorizeRoles('cashier'), async (req, res) => {
  try {
    const [customers] = await db.execute(
      'SELECT id, email, full_name, phone FROM users WHERE role = "customer" ORDER BY full_name ASC'
    );

    res.json(customers);
  } catch (error) {
    console.error('Get customers for in-store error:', error);
    res.status(500).json({ message: 'Failed to fetch customers' });
  }
});

module.exports = router;
