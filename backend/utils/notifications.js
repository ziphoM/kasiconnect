// backend/utils/notifications.js
const { pool } = require('../db');

/**
 * Create a notification for a user
 * @param {Object} options - Notification options
 * @param {number} options.userId - ID of user to notify
 * @param {string} options.type - Notification type (application, hire, complete, etc.)
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} options.link - Optional link to relevant page
 * @param {string} options.icon - Optional icon emoji or class
 * @param {Object} options.data - Optional additional data
 * @returns {Promise<Object>} Created notification
 */
async function createNotification({ userId, type, title, message, link = null, icon = null, data = null }) {
    try {
        const [result] = await pool.execute(
            `INSERT INTO notifications 
             (user_id, type, title, message, link, icon, data, created_at, is_read) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
            [userId, type, title, message, link, icon, data ? JSON.stringify(data) : null]
        );
        
        console.log(`✅ Notification created for user ${userId}: ${type}`);
        return { id: result.insertId, userId, type, title, message, link, icon, data };
    } catch (error) {
        console.error('❌ Error creating notification:', error);
        return null;
    }
}

/**
 * Create notifications for multiple users
 * @param {Array} notifications - Array of notification options
 * @returns {Promise<Array>} Created notifications
 */
async function createBulkNotifications(notifications) {
    const results = [];
    for (const notif of notifications) {
        const result = await createNotification(notif);
        if (result) results.push(result);
    }
    return results;
}

module.exports = {
    createNotification,
    createBulkNotifications
};