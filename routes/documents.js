const express = require('express');
const path = require('path');
const pool = require('../config/database');
const { authenticateToken, authorize, checkEmployeeAccess } = require('../middleware/auth');
const { logActivity } = require('../middleware/logger');
const { uploadEmployeeDoc, handleUploadError, getRelativePath, deleteFile } = require('../middleware/upload');
const { documentValidation, paramValidation, validate } = require('../middleware/validation');

const router = express.Router();

// Get all documents for an employee
router.get('/employee/:employeeId', authenticateToken, async (req, res) => {
    try {
        const { employeeId } = req.params;

        // Check employee access
        const [employee] = await pool.query(
            'SELECT company_id FROM employees WHERE id = ?',
            [employeeId]
        );

        if (employee.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        if (req.user.role !== 'SUPER_ADMIN' && req.user.company_id !== employee[0].company_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [documents] = await pool.query(
            `SELECT d.*, u1.first_name as uploaded_by_name, u2.first_name as verified_by_name
             FROM employee_documents d
             LEFT JOIN users u1 ON d.uploaded_by = u1.id
             LEFT JOIN users u2 ON d.verified_by = u2.id
             WHERE d.employee_id = ?
             ORDER BY d.uploaded_at DESC`,
            [employeeId]
        );

        res.json(documents);
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

// Upload document
router.post('/employee/:employeeId', authenticateToken, authorize('SUPER_ADMIN', 'COMPANY_ADMIN'),
    documentValidation.upload, validate,
    uploadEmployeeDoc.single('document'), handleUploadError, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { document_type, document_name, remarks } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Check employee access
        const [employee] = await pool.query(
            'SELECT company_id, first_name, last_name FROM employees WHERE id = ?',
            [employeeId]
        );

        if (employee.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        if (req.user.role !== 'SUPER_ADMIN' && req.user.company_id !== employee[0].company_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const filePath = getRelativePath(req.file.path);

        const [result] = await pool.query(
            `INSERT INTO employee_documents 
             (employee_id, document_type, document_name, original_filename, file_path, 
              file_size, mime_type, remarks, uploaded_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                employeeId, document_type, document_name || req.file.originalname,
                req.file.originalname, filePath, req.file.size, req.file.mimetype,
                remarks, req.user.id
            ]
        );

        await logActivity({
            userId: req.user.id,
            companyId: employee[0].company_id,
            action: 'UPLOAD',
            entityType: 'document',
            entityId: result.insertId,
            description: `Uploaded ${document_type} for ${employee[0].first_name} ${employee[0].last_name}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        const [newDoc] = await pool.query(
            'SELECT * FROM employee_documents WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(newDoc[0]);
    } catch (error) {
        console.error('Upload document error:', error);
        res.status(500).json({ error: 'Failed to upload document' });
    }
});

// Download document
router.get('/:id/download', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const [documents] = await pool.query(
            `SELECT d.*, e.company_id 
             FROM employee_documents d
             JOIN employees e ON d.employee_id = e.id
             WHERE d.id = ?`,
            [id]
        );

        if (documents.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const document = documents[0];

        // Check access
        if (req.user.role !== 'SUPER_ADMIN' && req.user.company_id !== document.company_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const filePath = path.join(process.cwd(), document.file_path);

        await logActivity({
            userId: req.user.id,
            companyId: document.company_id,
            action: 'DOWNLOAD',
            entityType: 'document',
            entityId: parseInt(id),
            description: `Downloaded ${document.document_type} document`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.download(filePath, document.original_filename);
    } catch (error) {
        console.error('Download document error:', error);
        res.status(500).json({ error: 'Failed to download document' });
    }
});

// Verify document
router.put('/:id/verify', authenticateToken, authorize('SUPER_ADMIN', 'COMPANY_ADMIN'),
    paramValidation.id, validate, async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;

        const [documents] = await pool.query(
            `SELECT d.*, e.company_id 
             FROM employee_documents d
             JOIN employees e ON d.employee_id = e.id
             WHERE d.id = ?`,
            [id]
        );

        if (documents.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const document = documents[0];

        // Check access
        if (req.user.role !== 'SUPER_ADMIN' && req.user.company_id !== document.company_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await pool.query(
            `UPDATE employee_documents 
             SET is_verified = TRUE, verified_by = ?, verified_at = NOW(), remarks = ?
             WHERE id = ?`,
            [req.user.id, remarks, id]
        );

        await logActivity({
            userId: req.user.id,
            companyId: document.company_id,
            action: 'VERIFY',
            entityType: 'document',
            entityId: parseInt(id),
            description: `Verified ${document.document_type} document`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        const [updated] = await pool.query('SELECT * FROM employee_documents WHERE id = ?', [id]);
        res.json(updated[0]);
    } catch (error) {
        console.error('Verify document error:', error);
        res.status(500).json({ error: 'Failed to verify document' });
    }
});

// Delete document
router.delete('/:id', authenticateToken, authorize('SUPER_ADMIN', 'COMPANY_ADMIN'),
    paramValidation.id, validate, async (req, res) => {
    try {
        const { id } = req.params;

        const [documents] = await pool.query(
            `SELECT d.*, e.company_id 
             FROM employee_documents d
             JOIN employees e ON d.employee_id = e.id
             WHERE d.id = ?`,
            [id]
        );

        if (documents.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const document = documents[0];

        // Check access
        if (req.user.role !== 'SUPER_ADMIN' && req.user.company_id !== document.company_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Delete file
        await deleteFile(document.file_path);

        await pool.query('DELETE FROM employee_documents WHERE id = ?', [id]);

        await logActivity({
            userId: req.user.id,
            companyId: document.company_id,
            action: 'DELETE',
            entityType: 'document',
            entityId: parseInt(id),
            description: `Deleted ${document.document_type} document`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

module.exports = router;
