const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult, query } = require('express-validator');

// Dashboard data endpoint
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Only branch managers can access reports
    if (req.user.role !== 'branch_manager') {
      return res.status(403).json({ message: 'Access denied. Branch manager role required.' });
    }

    const { dateRange, startDate, endDate, orderType, status } = req.query;

    // Build date filter
    let dateFilter = '';
    let dateParams = [];
    
    if (dateRange === 'custom' && startDate && endDate) {
      dateFilter = 'AND o.created_at BETWEEN ? AND ?';
      dateParams = [startDate, endDate + ' 23:59:59'];
    } else {
      const ranges = {
        'last30days': 30,
        'last3months': 90,
        'last6months': 180,
        'lastyear': 365
      };
      const days = ranges[dateRange] || 180;
      dateFilter = 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      dateParams = [days];
    }

    // Build additional filters
    let orderTypeFilter = '';
    let orderTypeParams = [];
    if (orderType && orderType !== 'all') {
      orderTypeFilter = 'AND o.order_type = ?';
      orderTypeParams = [orderType];
    }

    let statusFilter = '';
    let statusParams = [];
    // Always filter for completed orders only
    statusFilter = 'AND o.status = "completed"';

    const allParams = [...dateParams, ...orderTypeParams, ...statusParams];

    // Summary statistics
    const [summaryResult] = await db.execute(`
      SELECT 
        COUNT(*) as totalOrders,
        COALESCE(SUM(o.final_total), 0) as totalRevenue,
        COALESCE(AVG(o.final_total), 0) as averageOrderValue,
        COUNT(CASE WHEN EXISTS(
          SELECT 1 FROM order_items oi 
          JOIN products p ON oi.product_id = p.id 
          WHERE oi.order_id = o.id AND p.requires_prescription = 1
        ) THEN 1 END) as prescriptionOrders
      FROM orders o 
      WHERE 1=1 ${dateFilter} ${orderTypeFilter} ${statusFilter}
    `, allParams);

    // Monthly revenue trend
    const [monthlyRevenue] = await db.execute(`
      SELECT 
        DATE_FORMAT(o.created_at, '%Y-%m') as month,
        COALESCE(SUM(o.final_total), 0) as revenue,
        COUNT(*) as orders
      FROM orders o 
      WHERE 1=1 ${dateFilter} ${orderTypeFilter} ${statusFilter}
      GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `, allParams);

    // Weekly revenue trend
    const [weeklyRevenue] = await db.execute(`
      SELECT 
        YEAR(o.created_at) as year,
        WEEK(o.created_at, 1) as week_number,
        COALESCE(SUM(o.final_total), 0) as revenue,
        COUNT(*) as orders
      FROM orders o 
      WHERE 1=1 ${dateFilter} ${orderTypeFilter} ${statusFilter}
      GROUP BY YEAR(o.created_at), WEEK(o.created_at, 1)
      ORDER BY YEAR(o.created_at) DESC, WEEK(o.created_at, 1) DESC
      LIMIT 8
    `, allParams);

    // Daily revenue trend (last 30 days)
    const [dailyRevenue] = await db.execute(`
      SELECT 
        DATE(o.created_at) as date,
        COALESCE(SUM(o.final_total), 0) as revenue,
        COUNT(*) as orders
      FROM orders o 
      WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) ${orderTypeFilter} ${statusFilter}
      GROUP BY DATE(o.created_at)
      ORDER BY DATE(o.created_at) DESC
      LIMIT 30
    `, [...orderTypeParams, ...statusParams]);

    // Top selling products
    const [topProducts] = await db.execute(`
      SELECT 
        p.id,
        p.name,
        c.name as categoryName,
        p.requires_prescription as requiresPrescription,
        SUM(oi.quantity) as totalQuantity,
        SUM(oi.total_price) as totalRevenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN orders o ON oi.order_id = o.id
      WHERE 1=1 ${dateFilter} ${orderTypeFilter} ${statusFilter}
      GROUP BY p.id, p.name, c.name, p.requires_prescription
      ORDER BY totalQuantity DESC
      LIMIT 10
    `, allParams);

    // Staff performance - REMOVED (không cần thiết cho sales report)

    // Payment method breakdown  
    const [paymentMethodBreakdown] = await db.execute(`
      SELECT 
        CASE 
          WHEN o.payment_method = 'credit_card' THEN 'Credit Card'
          WHEN o.payment_method = 'debit_card' THEN 'Debit Card'  
          WHEN o.payment_method = 'paypal' THEN 'PayPal'
          WHEN o.payment_method = 'bank_transfer' THEN 'Bank Transfer'
          ELSE 'Cash'
        END as method,
        COUNT(*) as count,
        COALESCE(SUM(o.final_total), 0) as revenue
      FROM orders o
      WHERE 1=1 ${dateFilter} ${orderTypeFilter} ${statusFilter}
      GROUP BY o.payment_method
      ORDER BY count DESC
    `, allParams);

    // Delivery method breakdown
    const [deliveryMethodBreakdown] = await db.execute(`
      SELECT 
        CASE 
          WHEN o.delivery_method = 'pickup' THEN 'Pickup'
          WHEN o.delivery_method = 'home_delivery' THEN 'Home Delivery'
          WHEN o.delivery_method = 'express_delivery' THEN 'Express Delivery'
          ELSE 'Pickup'
        END as method,
        COUNT(*) as count,
        COALESCE(SUM(o.final_total), 0) as revenue
      FROM orders o
      WHERE 1=1 ${dateFilter} ${orderTypeFilter} ${statusFilter}
      GROUP BY o.delivery_method
      ORDER BY revenue DESC
    `, allParams);

    // Format the response
    const dashboardData = {
      summary: summaryResult[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        prescriptionOrders: 0
      },
      monthlyRevenue: monthlyRevenue.reverse(), // Show oldest to newest
      weeklyRevenue: weeklyRevenue.reverse().map(row => ({
        week: `Week ${row.week_number}`,
        revenue: row.revenue,
        orders: row.orders
      })), // Show oldest to newest with formatted week label
      dailyRevenue: dailyRevenue.reverse(), // Show oldest to newest
      topProducts: topProducts,
      paymentMethodBreakdown: paymentMethodBreakdown,
      deliveryMethodBreakdown: deliveryMethodBreakdown
    };

    res.json(dashboardData);

  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Download report endpoint
router.get('/download', authenticateToken, async (req, res) => {
  try {
    // Only branch managers can download reports
    if (req.user.role !== 'branch_manager') {
      return res.status(403).json({ message: 'Access denied. Branch manager role required.' });
    }

    const { format, dateRange, startDate, endDate, orderType, status } = req.query;

    // Build filters (same logic as dashboard)
    let dateFilter = '';
    let dateParams = [];
    
    if (dateRange === 'custom' && startDate && endDate) {
      dateFilter = 'AND o.created_at BETWEEN ? AND ?';
      dateParams = [startDate, endDate + ' 23:59:59'];
    } else {
      const ranges = {
        'last30days': 30,
        'last3months': 90,
        'last6months': 180,
        'lastyear': 365
      };
      const days = ranges[dateRange] || 180;
      dateFilter = 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      dateParams = [days];
    }

    let orderTypeFilter = '';
    let orderTypeParams = [];
    if (orderType && orderType !== 'all') {
      orderTypeFilter = 'AND o.order_type = ?';
      orderTypeParams = [orderType];
    }

    let statusFilter = '';
    let statusParams = [];
    // Always filter for completed orders only
    statusFilter = 'AND o.status = "completed"';

    const allParams = [...dateParams, ...orderTypeParams, ...statusParams];

    // Get detailed report data
    const [reportData] = await db.execute(`
      SELECT 
        o.id as order_id,
        o.created_at,
        u.full_name as customer_name,
        u.email as customer_email,
        o.order_type,
        o.status,
        o.total_amount,
        o.delivery_fee,
        o.final_total,
        o.payment_method,
        o.delivery_method,
        cashier.full_name as cashier_name,
        pharmacist.full_name as pharmacist_name,
        GROUP_CONCAT(CONCAT(p.name, ' (', oi.quantity, 'x)') SEPARATOR ', ') as products
      FROM orders o
      JOIN users u ON o.customer_id = u.id
      LEFT JOIN users cashier ON o.cashier_id = cashier.id
      LEFT JOIN users pharmacist ON o.prescription_validated_by = pharmacist.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE 1=1 ${dateFilter} ${orderTypeFilter} ${statusFilter}
      GROUP BY o.id, o.created_at, u.full_name, u.email, o.order_type, o.status, 
               o.total_amount, o.delivery_fee, o.final_total, o.payment_method, 
               o.delivery_method, cashier.full_name, pharmacist.full_name
      ORDER BY o.created_at DESC
    `, allParams);

    // Return data for PDF processing in frontend
    res.json({
      message: 'Report data ready for PDF processing',
      data: reportData
    });

  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
