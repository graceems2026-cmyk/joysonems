const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { logLogin, logActivity } = require('../middleware/logger');
const { userValidation, validate } = require('../middleware/validation');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Login
router.post('/login', userValidation.login, validate, async (req, res) => {
    try {
        const { email, password } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        // Find user
        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const dbPath = path.join(__dirname, '..', 'employees.db');
        const db = new sqlite3.Database(dbPath);
        const users = await new Promise((resolve, reject) => {
            db.all(`SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.phone, u.role, u.company_id, 
                    u.profile_photo, u.is_active, u.last_login, u.failed_login_attempts, u.locked_until,
                    c.name as company_name, c.code as company_code, c.logo_path as company_logo
             FROM users u 
             LEFT JOIN companies c ON u.company_id = c.id
             WHERE u.email = ?`, [email], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        db.close();

        console.log('Users found:', users.length);
        if (users.length === 0) {
            await logLogin({
                email,
                status: 'FAILED',
                ipAddress,
                userAgent,
                failureReason: 'User not found'
            });
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];

        // Check if account is locked
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            await logLogin({
                userId: user.id,
                email,
                status: 'LOCKED',
                ipAddress,
                userAgent,
                failureReason: 'Account locked'
            });
            return res.status(423).json({ 
                error: 'Account is locked. Please try again later.',
                lockedUntil: user.locked_until
            });
        }

        // Check if account is active
        if (!user.is_active) {
            await logLogin({
                userId: user.id,
                email,
                status: 'FAILED',
                ipAddress,
                userAgent,
                failureReason: 'Account deactivated'
            });
            return res.status(403).json({ error: 'Account is deactivated' });
        }

        // Verify password
        if (!user.password_hash) {
            console.error('No password hash found for user:', user.id);
            return res.status(500).json({ error: 'Authentication configuration error' });
        }
        let isPasswordValid;
        try {
            isPasswordValid = await bcrypt.compare(password, user.password_hash);
        } catch (bcryptError) {
            console.error('Bcrypt error:', bcryptError);
            return res.status(500).json({ error: 'Authentication failed' });
        }
        if (!isPasswordValid) {
            await logLogin({
                userId: user.id,
                email,
                status: 'FAILED',
                ipAddress,
                userAgent,
                failureReason: 'Invalid password'
            });
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Create session
        req.session.userId = user.id;
        req.session.email = user.email;
        req.session.role = user.role;
        req.session.companyId = user.company_id;

        await logLogin({
            userId: user.id,
            email,
            status: 'SUCCESS',
            ipAddress,
            userAgent
        });

        await logActivity({
            userId: user.id,
            action: 'LOGIN',
            description: 'User logged in',
            ipAddress,
            userAgent
        });

        // Return success (no token needed for sessions)
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                companyId: user.company_id,
                companyName: user.company_name,
                companyCode: user.company_code,
                companyLogo: user.company_logo,
                profilePhoto: user.profile_photo,
                isActive: user.is_active
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    console.log('/me called, req.user:', req.user);
    try {
        const [users] = await pool.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, 
                    u.company_id, u.profile_photo, u.last_login,
                    c.name as company_name, c.code as company_code, c.logo_path as company_logo
             FROM users u
             LEFT JOIN companies c ON u.company_id = c.id
             WHERE u.id = ?`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        res.json({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone,
            role: user.role,
            companyId: user.company_id,
            companyName: user.company_name,
            companyCode: user.company_code,
            companyLogo: user.company_logo,
            profilePhoto: user.profile_photo,
            lastLogin: user.last_login
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        // Get current user
        const [users] = await pool.query(
            'SELECT password_hash FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await pool.query(
            'UPDATE users SET password_hash = ?, password_changed_at = NOW() WHERE id = ?',
            [hashedPassword, req.user.id]
        );

        await logActivity({
            userId: req.user.id,
            companyId: req.user.company_id,
            action: 'UPDATE',
            entityType: 'user',
            entityId: req.user.id,
            description: 'Password changed',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        await logActivity({
            userId: req.user.id,
            companyId: req.user.company_id,
            action: 'LOGOUT',
            entityType: 'user',
            entityId: req.user.id,
            description: `User ${req.user.email} logged out`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        // Destroy session
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
                return res.status(500).json({ error: 'Logout failed' });
            }
            res.clearCookie('connect.sid'); // Clear session cookie
            res.json({ message: 'Logged out successfully' });
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

// Verify token
router.get('/verify', authenticateToken, (req, res) => {
    res.json({ 
        valid: true, 
        user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
            companyId: req.user.company_id
        }
    });
});

module.exports = router;
