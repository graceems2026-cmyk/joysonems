const express = require('express');
const pool = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const { parsePagination, buildPaginationResponse } = require('../utils/helpers');

const router = express.Router();

// Get activity logs
router.get('/activity', authenticateToken, async (req, res) => {
    try {
        const { page, limit, offset } = parsePagination(req.query);
        const { action, entity_type, user_id, start_date, end_date } = req.query;

        console.log('Activity logs request:', { 
            user: req.user.email, 
            role: req.user.role, 
            company_id: req.user.company_id 
        });

        let whereClause = 'WHERE 1=1';
        let params = [];

        // Company admins can only see their company's logs
        if (req.user.role !== 'SUPER_ADMIN') {
            whereClause += ' AND al.company_id = ?';
            params.push(req.user.company_id);
        }

        if (action) {
            whereClause += ' AND al.action = ?';
            params.push(action);
        }

        if (entity_type) {
            whereClause += ' AND al.entity_type = ?';
            params.push(entity_type);
        }

        if (user_id) {
            whereClause += ' AND al.user_id = ?';
            params.push(user_id);
        }

        if (start_date) {
            whereClause += ' AND DATE(al.created_at) >= ?';
            params.push(start_date);
        }

        if (end_date) {
            whereClause += ' AND DATE(al.created_at) <= ?';
            params.push(end_date);
        }

        // Get total count
        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM activity_logs al ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Get logs
        const [logs] = await pool.query(
            `SELECT al.*, 
                    u.first_name, u.last_name, u.email,
                    c.name as company_name
             FROM activity_logs al
             LEFT JOIN users u ON al.user_id = u.id
             LEFT JOIN companies c ON al.company_id = c.id
             ${whereClause}
             ORDER BY al.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        console.log('Activity logs result:', { total, logs_count: logs.length });

        res.json(buildPaginationResponse(logs, total, page, limit));
    } catch (error) {
        console.error('Get activity logs error:', error);
        res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
});

// Get login logs
router.get('/login', authenticateToken, authorize('SUPER_ADMIN', 'COMPANY_ADMIN'), async (req, res) => {
    try {
        const { page, limit, offset } = parsePagination(req.query);
        const { status, user_id, start_date, end_date } = req.query;

        let whereClause = 'WHERE 1=1';
        let params = [];

        // Company admins can only see their company's users
        if (req.user.role !== 'SUPER_ADMIN') {
            whereClause += ' AND (u.company_id = ? OR ll.user_id IS NULL)';
            params.push(req.user.company_id);
        }

        if (status) {
            whereClause += ' AND ll.status = ?';
            params.push(status);
        }

        if (user_id) {
            whereClause += ' AND ll.user_id = ?';
            params.push(user_id);
        }

        if (start_date) {
            whereClause += ' AND DATE(ll.created_at) >= ?';
            params.push(start_date);
        }

        if (end_date) {
            whereClause += ' AND DATE(ll.created_at) <= ?';
            params.push(end_date);
        }

        // Get total count
        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM login_logs ll
             LEFT JOIN users u ON ll.user_id = u.id
             ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Get logs
        const [logs] = await pool.query(
            `SELECT ll.*, u.first_name, u.last_name, u.role, c.name as company_name
             FROM login_logs ll
             LEFT JOIN users u ON ll.user_id = u.id
             LEFT JOIN companies c ON u.company_id = c.id
             ${whereClause}
             ORDER BY ll.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json(buildPaginationResponse(logs, total, page, limit));
    } catch (error) {
        console.error('Get login logs error:', error);
        res.status(500).json({ error: 'Failed to fetch login logs' });
    }
});

// Get audit summary
router.get('/audit-summary', authenticateToken, authorize('SUPER_ADMIN', 'COMPANY_ADMIN'), async (req, res) => {
    try {
        const { days = 30 } = req.query;
        let params = [days];
        let companyFilter = '';

        if (req.user.role !== 'SUPER_ADMIN') {
            companyFilter = 'AND company_id = ?';
            params.push(req.user.company_id);
        }

        const [summary] = await pool.query(`
            SELECT 
                action,
                entity_type,
                COUNT(*) as count,
                COUNT(DISTINCT user_id) as unique_users,
                MAX(created_at) as last_occurrence
            FROM activity_logs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ${companyFilter}
            GROUP BY action, entity_type
            ORDER BY count DESC
        `, params);

        // Get most active users
        params = [days];
        if (req.user.role !== 'SUPER_ADMIN') {
            params.push(req.user.company_id);
        }

        const [activeUsers] = await pool.query(`
            SELECT 
                u.id, u.first_name, u.last_name, u.email, u.role,
                COUNT(al.id) as activity_count
            FROM activity_logs al
            JOIN users u ON al.user_id = u.id
            WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ${companyFilter}
            GROUP BY u.id, u.first_name, u.last_name, u.email, u.role
            ORDER BY activity_count DESC
            LIMIT 10
        `, params);

        res.json({
            summary,
            most_active_users: activeUsers,
            period_days: parseInt(days)
        });
    } catch (error) {
        console.error('Get audit summary error:', error);
        res.status(500).json({ error: 'Failed to fetch audit summary' });
    }
});

// Get activity by date range
router.get('/activity-timeline', authenticateToken, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        let params = [days];
        let companyFilter = '';

        if (req.user.role !== 'SUPER_ADMIN') {
            companyFilter = 'AND company_id = ?';
            params.push(req.user.company_id);
        }

        const [timeline] = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                action,
                COUNT(*) as count
            FROM activity_logs
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            ${companyFilter}
            GROUP BY DATE(created_at), action
            ORDER BY date DESC, action
        `, params);

        res.json(timeline);
    } catch (error) {
        console.error('Get activity timeline error:', error);
        res.status(500).json({ error: 'Failed to fetch activity timeline' });
    }
});

module.exports = router;
