const express = require('express');
const pool = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const { logActivity } = require('../middleware/logger');
const { uploadCompanyLogo, handleUploadError, getRelativePath, deleteFile } = require('../middleware/upload');
const { companyValidation, paramValidation, validate } = require('../middleware/validation');
const { parsePagination, buildPaginationResponse } = require('../utils/helpers');

const router = express.Router();

// Get all companies (Super Admin can see all, Company Admin sees only their company)
router.get('/', authenticateToken, authorize('SUPER_ADMIN', 'COMPANY_ADMIN'), async (req, res) => {
    try {
        const { page, limit, offset } = parsePagination(req.query);
        const { search, status } = req.query;

        let whereClause = 'WHERE 1=1';
        let params = [];

        // Company Admin can only see their own company
        if (req.user.role === 'COMPANY_ADMIN') {
            whereClause += ' AND id = ?';
            params.push(req.user.company_id);
        }

        if (search) {
            whereClause += ' AND (name LIKE ? OR code LIKE ? OR email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (status !== undefined) {
            whereClause += ' AND is_active = ?';
            params.push(status === 'true' || status === '1');
        }

        // Get total count
        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM companies ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Get companies with employee count
        const [companies] = await pool.query(
            `SELECT c.*, 
                    (SELECT COUNT(*) FROM employees WHERE company_id = c.id AND is_active = TRUE) as employee_count
             FROM companies c
             ${whereClause}
             ORDER BY c.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json({ companies, pagination: buildPaginationResponse(companies, total, page, limit).pagination });
    } catch (error) {
        console.error('Get companies error:', error);
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
});

// Get all companies for dropdown (minimal data)
router.get('/list', authenticateToken, authorize('SUPER_ADMIN'), async (req, res) => {
    try {
        const [companies] = await pool.query(
            'SELECT id, name, code, logo_path FROM companies WHERE is_active = TRUE ORDER BY name'
        );
        res.json(companies);
    } catch (error) {
        console.error('Get company list error:', error);
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
});

// Get single company
router.get('/:id', authenticateToken, paramValidation.id, validate, async (req, res) => {
    try {
        const { id } = req.params;

        // Company admins can only view their own company
        if (req.user.role !== 'SUPER_ADMIN' && req.user.company_id !== parseInt(id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [companies] = await pool.query(
            `SELECT c.*,
                    (SELECT COUNT(*) FROM employees WHERE company_id = c.id) as total_employees,
                    (SELECT COUNT(*) FROM employees WHERE company_id = c.id AND status = 'Active') as active_employees,
                    (SELECT SUM(gross_salary) FROM employees WHERE company_id = c.id AND status = 'Active') as total_salary,
                    (SELECT COUNT(*) FROM users WHERE company_id = c.id AND is_active = TRUE) as admin_count
             FROM companies c
             WHERE c.id = ?`,
            [id]
        );

        if (companies.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        res.json(companies[0]);
    } catch (error) {
        console.error('Get company error:', error);
        res.status(500).json({ error: 'Failed to fetch company' });
    }
});

// Create company (Super Admin only)
router.post('/', authenticateToken, authorize('SUPER_ADMIN'), 
    uploadCompanyLogo.single('logo'), handleUploadError,
    companyValidation.create, validate, async (req, res) => {
    try {
        const {
            name, code, address, city, state, pincode, country,
            gst_number, pan_number, phone, email, website, established_date
        } = req.body;

        // Check if code already exists
        const [existing] = await pool.query(
            'SELECT id FROM companies WHERE code = ?',
            [code.toUpperCase()]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Company code already exists' });
        }
        
        // Handle logo upload
        const logoPath = req.file ? getRelativePath(req.file.path) : null;

        const [result] = await pool.query(
            `INSERT INTO companies (name, code, address, city, state, pincode, country,
                gst_number, pan_number, phone, email, website, established_date, logo_path)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, code.toUpperCase(), address, city, state, pincode, country || 'India',
             gst_number, pan_number, phone, email, website, established_date, logoPath]
        );

        // Create employee sequence for this company
        await pool.query(
            'INSERT INTO employee_sequences (company_id, last_sequence, prefix) VALUES (?, 0, ?)',
            [result.insertId, code.substring(0, 3).toUpperCase()]
        );

        await logActivity({
            userId: req.user.id,
            companyId: result.insertId,
            action: 'CREATE',
            entityType: 'company',
            entityId: result.insertId,
            description: `Created company: ${name}`,
            newValues: req.body,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        const [newCompany] = await pool.query('SELECT * FROM companies WHERE id = ?', [result.insertId]);
        res.status(201).json(newCompany[0]);
    } catch (error) {
        console.error('Create company error:', error);
        res.status(500).json({ error: 'Failed to create company' });
    }
});

// Update company
router.put('/:id', authenticateToken, paramValidation.id, 
    uploadCompanyLogo.single('logo'), handleUploadError,
    companyValidation.update, validate, async (req, res) => {
    try {
        const { id } = req.params;

        // Only Super Admin or company's own admin can update
        if (req.user.role !== 'SUPER_ADMIN' && req.user.company_id !== parseInt(id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get current company data
        const [current] = await pool.query('SELECT * FROM companies WHERE id = ?', [id]);
        if (current.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const {
            name, address, city, state, pincode, country,
            gst_number, pan_number, phone, email, website, established_date, is_active
        } = req.body;

        // Build update query dynamically
        const updates = [];
        const params = [];

        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (address !== undefined) { updates.push('address = ?'); params.push(address); }
        if (city !== undefined) { updates.push('city = ?'); params.push(city); }
        if (state !== undefined) { updates.push('state = ?'); params.push(state); }
        if (pincode !== undefined) { updates.push('pincode = ?'); params.push(pincode); }
        if (country !== undefined) { updates.push('country = ?'); params.push(country); }
        if (gst_number !== undefined) { updates.push('gst_number = ?'); params.push(gst_number); }
        if (pan_number !== undefined) { updates.push('pan_number = ?'); params.push(pan_number); }
        if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email); }
        if (website !== undefined) { updates.push('website = ?'); params.push(website); }
        if (established_date !== undefined) { updates.push('established_date = ?'); params.push(established_date); }
        if (is_active !== undefined && req.user.role === 'SUPER_ADMIN') { 
            updates.push('is_active = ?'); 
            params.push(is_active); 
        }
        
        // Handle logo upload
        if (req.file) {
            // Delete old logo if exists
            if (current[0].logo_path) {
                await deleteFile(current[0].logo_path);
            }
            const logoPath = getRelativePath(req.file.path);
            updates.push('logo_path = ?');
            params.push(logoPath);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id);
        await pool.query(
            `UPDATE companies SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        await logActivity({
            userId: req.user.id,
            companyId: parseInt(id),
            action: 'UPDATE',
            entityType: 'company',
            entityId: parseInt(id),
            description: `Updated company: ${current[0].name}`,
            oldValues: current[0],
            newValues: req.body,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        const [updated] = await pool.query('SELECT * FROM companies WHERE id = ?', [id]);
        res.json(updated[0]);
    } catch (error) {
        console.error('Update company error:', error);
        res.status(500).json({ error: 'Failed to update company' });
    }
});

// Upload company logo
router.post('/:id/logo', authenticateToken, paramValidation.id, validate, 
    uploadCompanyLogo.single('logo'), handleUploadError, async (req, res) => {
    try {
        const { id } = req.params;

        // Check access
        if (req.user.role !== 'SUPER_ADMIN' && req.user.company_id !== parseInt(id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Get current logo path to delete
        const [current] = await pool.query('SELECT logo_path FROM companies WHERE id = ?', [id]);
        if (current.length > 0 && current[0].logo_path) {
            await deleteFile(current[0].logo_path);
        }

        const logoPath = getRelativePath(req.file.path);

        await pool.query(
            'UPDATE companies SET logo_path = ? WHERE id = ?',
            [logoPath, id]
        );

        await logActivity({
            userId: req.user.id,
            companyId: parseInt(id),
            action: 'UPLOAD',
            entityType: 'company',
            entityId: parseInt(id),
            description: 'Updated company logo',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ 
            message: 'Logo uploaded successfully',
            logo_path: logoPath
        });
    } catch (error) {
        console.error('Upload logo error:', error);
        res.status(500).json({ error: 'Failed to upload logo' });
    }
});

// Delete company (Super Admin only)
router.delete('/:id', authenticateToken, authorize('SUPER_ADMIN'), paramValidation.id, validate, async (req, res) => {
    try {
        const { id } = req.params;

        const [company] = await pool.query('SELECT * FROM companies WHERE id = ?', [id]);
        if (company.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        // Check for employees
        const [employees] = await pool.query(
            'SELECT COUNT(*) as count FROM employees WHERE company_id = ?',
            [id]
        );

        if (employees[0].count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete company with employees. Remove all employees first.' 
            });
        }

        await pool.query('DELETE FROM companies WHERE id = ?', [id]);

        await logActivity({
            userId: req.user.id,
            action: 'DELETE',
            entityType: 'company',
            entityId: parseInt(id),
            description: `Deleted company: ${company[0].name}`,
            oldValues: company[0],
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ message: 'Company deleted successfully' });
    } catch (error) {
        console.error('Delete company error:', error);
        res.status(500).json({ error: 'Failed to delete company' });
    }
});

module.exports = router;
