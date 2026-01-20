const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const { logActivity } = require('../middleware/logger');
const { uploadProfilePhoto, handleUploadError, getRelativePath, deleteFile } = require('../middleware/upload');
const { userValidation, paramValidation, validate } = require('../middleware/validation');
const { parsePagination, buildPaginationResponse } = require('../utils/helpers');
const { encrypt, decrypt } = require('../utils/encryption');

const router = express.Router();

// Get all users (Super Admin only)
router.get('/', authenticateToken, authorize('SUPER_ADMIN'), async (req, res) => {
    try {
        const { page, limit, offset } = parsePagination(req.query);
        const { search, role, company_id } = req.query;

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (search) {
            whereClause += ' AND (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (role) {
            whereClause += ' AND u.role = ?';
            params.push(role);
        }

        if (company_id) {
            whereClause += ' AND u.company_id = ?';
            params.push(company_id);
        }

        // Get total count
        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM users u ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Get users
        const [users] = await pool.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role,
                    u.company_id, u.profile_photo, u.is_active, u.last_login, u.created_at,
                    c.name as company_name, c.code as company_code
             FROM users u
             LEFT JOIN companies c ON u.company_id = c.id
             ${whereClause}
             ORDER BY u.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json(buildPaginationResponse(users, total, page, limit));
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get single user
router.get('/:id', authenticateToken, paramValidation.id, validate, async (req, res) => {
    try {
        const { id } = req.params;

        // Users can view their own profile, Super Admin can view all
        if (req.user.role !== 'SUPER_ADMIN' && req.user.id !== parseInt(id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [users] = await pool.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role,
                    u.company_id, u.profile_photo, u.is_active, u.last_login, u.created_at,
                    c.name as company_name, c.code as company_code
             FROM users u
             LEFT JOIN companies c ON u.company_id = c.id
             WHERE u.id = ?`,
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(users[0]);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Create user (Super Admin only, or Company Admin for their company)
router.post('/', authenticateToken, userValidation.create, validate, async (req, res) => {
    try {
        const { email, password, first_name, last_name, phone, role, company_id } = req.body;

        // Only Super Admin can create any user type
        // Company Admin can only create HR/Viewer for their company
        if (req.user.role !== 'SUPER_ADMIN') {
            if (!['HR', 'VIEWER', 'AUDITOR'].includes(role)) {
                return res.status(403).json({ error: 'Cannot create this role' });
            }
            if (company_id !== req.user.company_id) {
                return res.status(403).json({ error: 'Cannot create user for other companies' });
            }
        }

        // Check if email exists
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email.toLowerCase()]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Validate company exists if provided
        if (company_id && role !== 'SUPER_ADMIN') {
            const [company] = await pool.query('SELECT id FROM companies WHERE id = ?', [company_id]);
            if (company.length === 0) {
                return res.status(400).json({ error: 'Company not found' });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        const encryptedPassword = encrypt(password);

        const [result] = await pool.query(
            `INSERT INTO users (email, password_hash, password_encrypted, first_name, last_name, phone, role, company_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [email.toLowerCase(), hashedPassword, encryptedPassword, first_name, last_name, phone, 
             role, role === 'SUPER_ADMIN' ? null : company_id]
        );

        await logActivity({
            userId: req.user.id,
            companyId: company_id,
            action: 'CREATE',
            entityType: 'user',
            entityId: result.insertId,
            description: `Created user: ${email}`,
            newValues: { email, first_name, last_name, role, company_id },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        const [newUser] = await pool.query(
            `SELECT id, email, first_name, last_name, phone, role, company_id, is_active, created_at
             FROM users WHERE id = ?`,
            [result.insertId]
        );

        res.status(201).json(newUser[0]);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update user
router.put('/:id', authenticateToken, paramValidation.id, userValidation.update, validate, async (req, res) => {
    try {
        const { id } = req.params;

        // Users can update their own profile, Super Admin can update all
        if (req.user.role !== 'SUPER_ADMIN' && req.user.id !== parseInt(id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [current] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        if (current.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { first_name, last_name, phone, role, company_id, is_active } = req.body;

        // Only Super Admin can change role and company
        const updates = [];
        const params = [];

        if (first_name !== undefined) { updates.push('first_name = ?'); params.push(first_name); }
        if (last_name !== undefined) { updates.push('last_name = ?'); params.push(last_name); }
        if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
        
        if (req.user.role === 'SUPER_ADMIN') {
            if (role !== undefined) { updates.push('role = ?'); params.push(role); }
            if (company_id !== undefined) { updates.push('company_id = ?'); params.push(company_id); }
            if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id);
        await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        await logActivity({
            userId: req.user.id,
            companyId: req.user.company_id,
            action: 'UPDATE',
            entityType: 'user',
            entityId: parseInt(id),
            description: `Updated user: ${current[0].email}`,
            oldValues: { first_name: current[0].first_name, last_name: current[0].last_name },
            newValues: req.body,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        const [updated] = await pool.query(
            `SELECT id, email, first_name, last_name, phone, role, company_id, is_active
             FROM users WHERE id = ?`,
            [id]
        );

        res.json(updated[0]);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Upload user profile photo
router.post('/:id/photo', authenticateToken, paramValidation.id, validate,
    uploadProfilePhoto.single('photo'), handleUploadError, async (req, res) => {
    try {
        const { id } = req.params;

        // Users can update their own photo
        if (req.user.role !== 'SUPER_ADMIN' && req.user.id !== parseInt(id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Get current photo to delete
        const [current] = await pool.query('SELECT profile_photo FROM users WHERE id = ?', [id]);
        if (current.length > 0 && current[0].profile_photo) {
            await deleteFile(current[0].profile_photo);
        }

        const photoPath = getRelativePath(req.file.path);

        await pool.query(
            'UPDATE users SET profile_photo = ? WHERE id = ?',
            [photoPath, id]
        );

        res.json({
            message: 'Photo uploaded successfully',
            profile_photo: photoPath
        });
    } catch (error) {
        console.error('Upload photo error:', error);
        res.status(500).json({ error: 'Failed to upload photo' });
    }
});

// Delete user (Super Admin only)
router.delete('/:id', authenticateToken, authorize('SUPER_ADMIN'), paramValidation.id, validate, async (req, res) => {
    try {
        const { id } = req.params;

        // Cannot delete self
        if (req.user.id === parseInt(id)) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        await pool.query('DELETE FROM users WHERE id = ?', [id]);

        await logActivity({
            userId: req.user.id,
            action: 'DELETE',
            entityType: 'user',
            entityId: parseInt(id),
            description: `Deleted user: ${user[0].email}`,
            oldValues: { email: user[0].email, role: user[0].role },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Get user password (Super Admin only)
router.get('/:id/password', authenticateToken, authorize('SUPER_ADMIN'), paramValidation.id, validate, async (req, res) => {
    try {
        const { id } = req.params;

        const [users] = await pool.query(
            'SELECT id, email, password_encrypted FROM users WHERE id = ?',
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!users[0].password_encrypted) {
            return res.json({ 
                password: null,
                note: 'Password was created before encryption feature. Cannot view original password.'
            });
        }

        // Decrypt and return the original password
        const decryptedPassword = decrypt(users[0].password_encrypted);
        res.json({ 
            password: decryptedPassword
        });
    } catch (error) {
        console.error('Get password error:', error);
        res.status(500).json({ error: 'Failed to retrieve password' });
    }
});

// Change user password (Super Admin only)
router.put('/:id/password', authenticateToken, authorize('SUPER_ADMIN'), paramValidation.id, validate, async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        // Validate password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
            });
        }

        const [users] = await pool.query('SELECT id, email FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const encryptedPassword = encrypt(password);

        await pool.query(
            'UPDATE users SET password_hash = ?, password_encrypted = ? WHERE id = ?',
            [hashedPassword, encryptedPassword, id]
        );

        await logActivity({
            userId: req.user.id,
            action: 'UPDATE',
            entityType: 'user',
            entityId: parseInt(id),
            description: `Changed password for user: ${users[0].email}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

module.exports = router;
