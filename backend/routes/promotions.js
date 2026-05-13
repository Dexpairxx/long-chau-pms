const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { sendPromotionEmail } = require('./orders');

// Get all promotions (for history)
router.get('/', authenticateToken, authorizeRoles('branch_manager'), async (req, res) => {
  try {
    const [promotions] = await db.execute(`
      SELECT 
        p.*,
        COUNT(pr.id) as recipient_count
      FROM promotions p
      LEFT JOIN promotion_recipients pr ON p.id = pr.promotion_id
      WHERE p.created_by = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [req.user.id]);

    res.json({ promotions });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ message: 'Failed to fetch promotions' });
  }
});

// Send promotion email
router.post('/send', authenticateToken, authorizeRoles('branch_manager'), async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { title, content, recipients } = req.body;

    if (!title || !content || !recipients || recipients.length === 0) {
      return res.status(400).json({ message: 'Title, content, and recipients are required' });
    }

    await connection.beginTransaction();

    // Create promotion record
    const [promotionResult] = await connection.execute(`
      INSERT INTO promotions (title, content, status, created_by, sent_at)
      VALUES (?, ?, 'sent', ?, NOW())
    `, [title, content, req.user.id]);

    const promotionId = promotionResult.insertId;

    // Add recipients
    const recipientValues = recipients.map(recipientId => [promotionId, recipientId]);
    await connection.execute(`
      INSERT INTO promotion_recipients (promotion_id, user_id)
      VALUES ${recipients.map(() => '(?, ?)').join(', ')}
    `, recipientValues.flat());

    // Get recipient details for email sending
    const [customers] = await connection.execute(`
      SELECT id, email, full_name
      FROM users
      WHERE id IN (${recipients.map(() => '?').join(', ')}) AND role = 'customer'
    `, recipients);

    await connection.commit();

    // Send promotion emails to customers
    console.log(`Starting to send promotion "${title}" to ${customers.length} customers...`);
    
    let sentCount = 0;
    let failedCount = 0;
    const emailResults = [];

    for (const customer of customers) {
      try {
        const result = await sendPromotionEmail(
          customer.email,
          customer.full_name,
          title,
          content
        );
        
        emailResults.push({
          ...customer,
          status: 'sent',
          messageId: result.messageId,
          simulated: result.simulated
        });
        
        sentCount++;
        
        // Add small delay between emails to avoid rate limiting
        if (!result.simulated && customers.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
        
      } catch (error) {
        console.error(`Failed to send promotion to ${customer.full_name} (${customer.email}):`, error.message);
        emailResults.push({
          ...customer,
          status: 'failed',
          error: error.message
        });
        failedCount++;
      }
    }

    console.log(`Promotion email summary: ${sentCount} sent, ${failedCount} failed`);

    res.json({ 
      message: `Promotion sent successfully to ${sentCount} customers${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      promotionId,
      sentTo: sentCount,
      failed: failedCount,
      details: emailResults
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error sending promotion:', error);
    res.status(500).json({ message: 'Failed to send promotion' });
  } finally {
    connection.release();
  }
});

// Get promotion details
router.get('/:id', authenticateToken, authorizeRoles('branch_manager'), async (req, res) => {
  try {
    const [promotions] = await db.execute(`
      SELECT 
        p.*,
        COUNT(pr.id) as recipient_count
      FROM promotions p
      LEFT JOIN promotion_recipients pr ON p.id = pr.promotion_id
      WHERE p.id = ? AND p.created_by = ?
      GROUP BY p.id
    `, [req.params.id, req.user.id]);

    if (promotions.length === 0) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    // Get recipients
    const [recipients] = await db.execute(`
      SELECT u.id, u.email, u.full_name
      FROM promotion_recipients pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.promotion_id = ?
    `, [req.params.id]);

    const promotion = promotions[0];
    promotion.recipients = recipients;

    res.json({ promotion });
  } catch (error) {
    console.error('Error fetching promotion details:', error);
    res.status(500).json({ message: 'Failed to fetch promotion details' });
  }
});

// Test email configuration
router.post('/test-email', authenticateToken, authorizeRoles('branch_manager'), async (req, res) => {
  try {
    const { email } = req.body;
    const testEmail = email || req.user.email;
    
    if (!testEmail) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const result = await sendPromotionEmail(
      testEmail,
      req.user.full_name || 'Test User',
      'Long Chau PMS - Email Configuration Test',
      'This is a test email to verify your email configuration is working correctly.\n\nIf you receive this email, your SMTP settings are properly configured!\n\nBest regards,\nLong Chau Pharmacy Team'
    );

    res.json({ 
      message: 'Test email sent successfully!',
      result: {
        sent: result.success,
        messageId: result.messageId,
        simulated: result.simulated,
        recipient: testEmail
      }
    });

  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({ 
      message: 'Test email failed', 
      error: error.message 
    });
  }
});

module.exports = router;