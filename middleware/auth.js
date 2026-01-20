const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Verify Session
const authenticateToken = async (req, res, next) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Get user from database
        const [users] = await pool.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.company_id,
                    u.is_active, c.name as company_name, c.code as company_code
             FROM users u
             LEFT JOIN companies c ON u.company_id = c.id
             WHERE u.id = ?`,
            [req.session.userId]
        );

        if (users.length === 0) {
            // Clear invalid session
            req.session.destroy();
            return res.status(401).json({ error: 'User not found' });
        }

        const user = users[0];

        if (!user.is_active) {
            // Clear session for inactive user
            req.session.destroy();
            return res.status(403).json({ error: 'Account is deactivated' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};

// Role-based access control middleware
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Insufficient permissions',
                required: allowedRoles,
                current: req.user.role
            });
        }

        next();
    };
};

// Check if user has access to company
const checkCompanyAccess = async (req, res, next) => {
    try {
        const requestedCompanyId = parseInt(req.params.companyId || req.body.company_id || req.query.company_id);

        // Super admin has access to all companies
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        // Company admin can only access their own company
        if (requestedCompanyId && req.user.company_id !== requestedCompanyId) {
            return res.status(403).json({ 
                error: 'Access denied to this company' 
            });
        }

        next();
    } catch (error) {
        console.error('Company access check error:', error);
        return res.status(500).json({ error: 'Authorization failed' });
    }
};

// Check if user has access to employee
const checkEmployeeAccess = async (req, res, next) => {
    try {
        const employeeId = req.params.id || req.params.employeeId;
        
        if (!employeeId) {
            return next();
        }

        // Super admin has access to all employees
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        // Check if employee belongs to user's company
        const [employees] = await pool.query(
            'SELECT company_id FROM employees WHERE id = ?',
            [employeeId]
        );

        if (employees.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        if (employees[0].company_id !== req.user.company_id) {
            return res.status(403).json({ 
                error: 'Access denied to this employee' 
            });
        }

        next();
    } catch (error) {
        console.error('Employee access check error:', error);
        return res.status(500).json({ error: 'Authorization failed' });
    }
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        const [users] = await pool.query(
            'SELECT id, email, first_name, last_name, role, company_id, is_active FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length > 0 && users[0].is_active) {
            req.user = users[0];
        }

        next();
    } catch (error) {
        next();
    }
};

module.exports = {
    authenticateToken,
    authorize,
    checkCompanyAccess,
    checkEmployeeAccess,
    optionalAuth
};
