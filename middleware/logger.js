const pool = require('../config/database');

// Log activity to database
const logActivity = async (options) => {
    try {
        const {
            userId,
            companyId,
            action,
            entityType,
            entityId,
            description,
            oldValues,
            newValues,
            ipAddress,
            userAgent
        } = options;

        // Format current time in local timezone (YYYY-MM-DD HH:MM:SS)
        const now = new Date();
        const localTime = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + ' ' +
            String(now.getHours()).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0') + ':' +
            String(now.getSeconds()).padStart(2, '0');

        await pool.query(
            `INSERT INTO activity_logs 
             (user_id, company_id, action, entity_type, entity_id, description, 
              old_values, new_values, ip_address, user_agent, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId || null,
                companyId || null,
                action,
                entityType,
                entityId || null,
                description || null,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                ipAddress || null,
                userAgent || null,
                localTime
            ]
        );
    } catch (error) {
        console.error('Failed to log activity:', error.message);
    }
};

// Middleware to automatically log actions
const activityLogger = (action, entityType) => {
    return async (req, res, next) => {
        // Store original json function
        const originalJson = res.json;
        
        // Override json function
        res.json = function(data) {
            // Log activity after successful response
            if (res.statusCode >= 200 && res.statusCode < 300) {
                logActivity({
                    userId: req.user?.id,
                    companyId: req.user?.company_id || req.body?.company_id,
                    action,
                    entityType,
                    entityId: req.params.id || data?.id,
                    description: `${action} ${entityType}`,
                    oldValues: req.oldValues,
                    newValues: req.body,
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.headers['user-agent']
                });
            }
            
            return originalJson.call(this, data);
        };
        
        next();
    };
};

// Log login attempt
const logLogin = async (options) => {
    try {
        const { userId, email, status, ipAddress, userAgent, failureReason } = options;

        await pool.query(
            `INSERT INTO login_logs (user_id, email, status, ip_address, user_agent, failure_reason, created_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
            [userId || null, email, status, ipAddress || null, userAgent || null, failureReason || null]
        );
    } catch (error) {
        console.error('Failed to log login:', error.message);
    }
};

module.exports = {
    logActivity,
    activityLogger,
    logLogin
};
