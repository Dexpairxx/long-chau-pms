const cron = require('node-cron');
const db = require('../config/database');

// Function to auto-complete orders that have been paid for over 2 minutes
async function autoCompleteOrders() {
    try {
        console.log('Checking for orders to auto-complete...');
        
        // Find orders that are 'paid' and have been paid for more than 2 minutes
        // and are cash/pickup orders (payment_method = 'cash')
        const query = `
            UPDATE orders 
            SET status = 'completed',
                updated_at = NOW()
            WHERE status = 'paid' 
                AND paid_at IS NOT NULL 
                AND paid_at <= DATE_SUB(NOW(), INTERVAL 2 MINUTE)
        `;
        
        const [result] = await db.execute(query);
        
        if (result.affectedRows > 0) {
            console.log(`Auto-completed ${result.affectedRows} orders`);
        }
        
    } catch (error) {
        console.error('Error in auto-complete orders job:', error);
    }
}

// Function to start the background job
function startOrderStatusUpdater() {
    console.log('Starting order status updater background job...');
    
    // Run every minute to check for orders to auto-complete
    cron.schedule('* * * * *', async () => {
        await autoCompleteOrders();
    });
    
    console.log('Order status updater job scheduled to run every minute');
}

module.exports = { startOrderStatusUpdater };
