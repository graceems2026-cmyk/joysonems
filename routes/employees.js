const express = require('express');
const pool = require('../config/database');
const { authenticateToken, authorize, checkCompanyAccess, checkEmployeeAccess } = require('../middleware/auth');
const { logActivity } = require('../middleware/logger');
const { uploadProfilePhoto, uploadEmployeeFiles, handleUploadError, getRelativePath, deleteFile } = require('../middleware/upload');
const { employeeValidation, paramValidation, validate } = require('../middleware/validation');
const { parsePagination, buildPaginationResponse, formatDate } = require('../utils/helpers');
const { encrypt, decrypt, maskAadhaar, maskBankAccount } = require('../utils/encryption');
const XLSX = require('xlsx');
const multer = require('multer');
const path = require('path');

// Configure multer for leaving attachment
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/employees/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, PDF, DOC, and DOCX files are allowed.'));
        }
    }
});

const router = express.Router();

// Get all employees
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('=== GET /api/employees called ===');
        console.log('Query params:', req.query);
        console.log('User role:', req.user.role);
        console.log('User company_id:', req.user.company_id);
        
        const { page, limit, offset } = parsePagination(req.query);
        const { search, company_id, department, designation, status } = req.query;
        
        console.log('Extracted company_id from query:', company_id, 'Type:', typeof company_id);

        let whereClause = 'WHERE 1=1';
        let params = [];

        // Company admins can only see their company's employees
        if (req.user.role !== 'SUPER_ADMIN') {
            whereClause += ' AND e.company_id = ?';
            params.push(req.user.company_id);
        }

        // Allow SUPER_ADMIN to filter by company if company_id is provided
        if (req.user.role === 'SUPER_ADMIN' && company_id) {
            whereClause += ' AND e.company_id = ?';
            params.push(company_id);
        }

        if (search) {
            whereClause += ` AND (e.employee_id LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ? 
                             OR e.email LIKE ? OR e.mobile LIKE ? OR e.designation LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (department) {
            whereClause += ' AND e.department = ?';
            params.push(department);
        }

        if (designation) {
            whereClause += ' AND e.designation = ?';
            params.push(designation);
        }

        if (status) {
            whereClause += ' AND e.status = ?';
            params.push(status);
        }

        // Get total count
        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM employees e ${whereClause}`,
            params
        );
        const total = countResult[0].total;
        
        console.log(`Query: WHERE clause = ${whereClause}, Params = ${JSON.stringify(params)}, Total = ${total}`);

        // Get employees
        const [employees] = await pool.query(
            `SELECT e.id, e.employee_id, e.first_name, e.last_name,
                    (e.first_name || ' ' || IFNULL(e.last_name, '')) as full_name,
                    e.email, e.mobile, e.designation, e.department, e.date_of_joining,
                    e.gross_salary, e.status, e.profile_photo, e.gender,
                    e.emergency_contact_name, e.emergency_contact_phone, e.emergency_contact_relation,
                    e.aadhaar_attachment, e.driving_license_attachment, e.education_attachment, 
                    e.employment_attachment, e.bank_passbook_attachment,
                    c.id as company_id, c.name as company_name, c.code as company_code,
                    (SELECT COUNT(*) FROM employee_documents WHERE employee_id = e.id) as document_count
             FROM employees e
             JOIN companies c ON e.company_id = c.id
             ${whereClause}
             ORDER BY e.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json({ employees, pagination: buildPaginationResponse(employees, total, page, limit).pagination });
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

// Export employees to Excel
router.get('/export/excel', authenticateToken, async (req, res) => {
    try {
        const { company_id } = req.query;

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (req.user.role !== 'SUPER_ADMIN') {
            whereClause += ' AND e.company_id = ?';
            params.push(req.user.company_id);
        } else if (company_id) {
            whereClause += ' AND e.company_id = ?';
            params.push(company_id);
        }

        const [employees] = await pool.query(
            `SELECT e.employee_id, e.first_name, e.last_name, e.email, e.mobile,
                    e.designation, e.department, e.date_of_joining, e.status,
                    e.basic_salary, e.home_allowance, e.food_allowance, e.transport_allowance,
                    e.medical_allowance, e.special_allowance, e.gross_salary,
                    c.name as company_name
             FROM employees e
             JOIN companies c ON e.company_id = c.id
             ${whereClause}
             ORDER BY e.employee_id`,
            params
        );

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(employees);
        XLSX.utils.book_append_sheet(wb, ws, 'Employees');

        // Generate buffer
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename=employees.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

        await logActivity({
            userId: req.user.id,
            companyId: req.user.company_id,
            action: 'EXPORT',
            entityType: 'employee',
            description: 'Exported employees to Excel',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export employees' });
    }
});

// Get departments list
router.get('/metadata/departments', authenticateToken, async (req, res) => {
    try {
        let query = 'SELECT DISTINCT department FROM employees WHERE department IS NOT NULL';
        const params = [];

        if (req.user.role !== 'SUPER_ADMIN') {
            query += ' AND company_id = ?';
            params.push(req.user.company_id);
        }

        const [departments] = await pool.query(query + ' ORDER BY department', params);
        res.json(departments.map(d => d.department));
    } catch (error) {
        console.error('Get departments error:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

// Get designations list
router.get('/metadata/designations', authenticateToken, async (req, res) => {
    try {
        let query = 'SELECT DISTINCT designation FROM employees WHERE designation IS NOT NULL';
        const params = [];

        if (req.user.role !== 'SUPER_ADMIN') {
            query += ' AND company_id = ?';
            params.push(req.user.company_id);
        }

        const [designations] = await pool.query(query + ' ORDER BY designation', params);
        res.json(designations.map(d => d.designation));
    } catch (error) {
        console.error('Get designations error:', error);
        res.status(500).json({ error: 'Failed to fetch designations' });
    }
});

// Get all leave records
router.get('/all/leaves', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT 
                e.id as employee_id,
                e.first_name,
                e.last_name,
                e.employee_id,
                e.department,
                e.leave_records,
                c.id as company_id,
                c.name as company_name
            FROM employees e
            JOIN companies c ON e.company_id = c.id
        `;
        const params = [];

        if (req.user.role !== 'SUPER_ADMIN') {
            query += ' WHERE e.company_id = ?';
            params.push(req.user.company_id);
        }

        const [rows] = await pool.query(query, params);

        const leaves = [];
        rows.forEach(row => {
            if (row.leave_records) {
                let leaveRecords = [];
                try {
                    // Parse JSON if it's a string
                    if (typeof row.leave_records === 'string') {
                        leaveRecords = JSON.parse(row.leave_records);
                    } else if (Array.isArray(row.leave_records)) {
                        leaveRecords = row.leave_records;
                    }
                    
                    // Add employee info to each leave record
                    leaveRecords.forEach(record => {
                        leaves.push({
                            employee_id: row.employee_id,
                            first_name: row.first_name,
                            last_name: row.last_name,
                            company_id: row.company_id,
                            company_name: row.company_name,
                            type: record.type || record.leave_type,
                            from_date: record.from_date,
                            to_date: record.to_date,
                            reason: record.reason,
                            status: record.status || 'Pending',
                            remarks: record.remarks
                        });
                    });
                } catch (e) {
                    console.error('Error parsing leave records for employee', row.employee_id, e);
                }
            }
        });

        res.json(leaves);
    } catch (error) {
        console.error('Get all leave records error:', error);
        res.status(500).json({ error: 'Failed to fetch leave records' });
    }
});

// Get new joinings from last 30 days
router.get('/all/new-joinings', authenticateToken, async (req, res) => {
    try {
        console.log('=== GET /api/employees/all/new-joinings called ===');
        console.log('User:', req.user.id, 'Role:', req.user.role, 'Company:', req.user.company_id);
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
        
        let query = `
            SELECT e.id, e.first_name, e.last_name, e.employee_id, e.department, 
                   e.designation, e.date_of_joining, c.name as company_name
            FROM employees e
            LEFT JOIN companies c ON e.company_id = c.id
            WHERE e.date_of_joining >= ?
        `;
        let params = [thirtyDaysAgoStr];
        
        // If user is admin/hr of a company, show only their company
        if (req.user.role !== 'SUPER_ADMIN' && req.user.company_id) {
            query += ' AND e.company_id = ?';
            params.push(req.user.company_id);
        }
        
        query += ' ORDER BY e.date_of_joining DESC';
        
        console.log('Query:', query);
        console.log('Params:', params);
        
        const [employees] = await pool.query(query, params);
        
        console.log('Found employees:', employees?.length || 0);
        res.json(employees || []);
    } catch (error) {
        console.error('Get new joinings error:', error);
        res.status(500).json({ error: 'Failed to fetch new joinings', details: error.message });
    }
});

// Add leave record for an employee
router.post('/:id/leave', authenticateToken, authorize('SUPER_ADMIN', 'COMPANY_ADMIN'),
    checkEmployeeAccess, paramValidation.id, validate, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, from_date, to_date, reason, status, remarks } = req.body;

        if (!type || !from_date || !to_date || !reason) {
            return res.status(400).json({ error: 'Missing required fields: type, from_date, to_date, reason' });
        }

        // Get current employee with company_id
        const [employee] = await pool.query('SELECT leave_records, company_id FROM employees WHERE id = ?', [id]);
        if (employee.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Parse existing leave records
        let leaveRecords = [];
        if (employee[0].leave_records) {
            try {
                if (typeof employee[0].leave_records === 'string') {
                    leaveRecords = JSON.parse(employee[0].leave_records);
                } else if (Array.isArray(employee[0].leave_records)) {
                    leaveRecords = employee[0].leave_records;
                }
            } catch (e) {
                console.error('Error parsing existing leave records:', e);
                leaveRecords = [];
            }
        }

        // Add new leave record
        const newLeaveRecord = {
            type: type,
            from_date: from_date,
            to_date: to_date,
            reason: reason,
            status: status || 'Pending',
            remarks: remarks || null,
            created_at: new Date().toISOString()
        };
        leaveRecords.push(newLeaveRecord);

        // Update employee with new leave records
        await pool.query(
            'UPDATE employees SET leave_records = ? WHERE id = ?',
            [JSON.stringify(leaveRecords), id]
        );

        await logActivity({
            userId: req.user.id,
            companyId: employee[0].company_id,
            action: 'CREATE',
            entityType: 'leave_record',
            entityId: parseInt(id),
            description: `Added leave record: ${type} from ${from_date} to ${to_date}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ 
            message: 'Leave record added successfully',
            leave_record: newLeaveRecord
        });
    } catch (error) {
        console.error('Add leave record error:', error);
        res.status(500).json({ error: 'Failed to add leave record' });
    }
});

// Add salary increment record for an employee
router.post('/:id/salary-increment', authenticateToken, authorize('SUPER_ADMIN', 'COMPANY_ADMIN'),
    checkEmployeeAccess, paramValidation.id, validate, async (req, res) => {
    try {
        const { id } = req.params;
        const { date, increased_amount, description } = req.body;

        if (!date || !increased_amount || !description) {
            return res.status(400).json({ error: 'Missing required fields: date, increased_amount, description' });
        }

        const increasedAmount = parseFloat(increased_amount);
        if (isNaN(increasedAmount) || increasedAmount <= 0) {
            return res.status(400).json({ error: 'Invalid increased_amount: must be a positive number' });
        }

        // Get current employee with company_id and current salary
        const [employee] = await pool.query('SELECT salary_increment_records, company_id, gross_salary FROM employees WHERE id = ?', [id]);
        if (employee.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Parse existing salary increment records
        let incrementRecords = [];
        if (employee[0].salary_increment_records) {
            try {
                if (typeof employee[0].salary_increment_records === 'string') {
                    incrementRecords = JSON.parse(employee[0].salary_increment_records);
                } else if (Array.isArray(employee[0].salary_increment_records)) {
                    incrementRecords = employee[0].salary_increment_records;
                }
            } catch (e) {
                console.error('Error parsing existing salary increment records:', e);
                incrementRecords = [];
            }
        }

        // Calculate new gross salary
        const currentGrossSalary = parseFloat(employee[0].gross_salary) || 0;
        const newGrossSalary = currentGrossSalary + increasedAmount;

        // Add new salary increment record
        const newIncrementRecord = {
            date: date,
            increased_amount: increasedAmount,
            description: description,
            created_at: new Date().toISOString()
        };
        incrementRecords.push(newIncrementRecord);

        // Update employee with new salary increment records and updated gross salary
        await pool.query(
            'UPDATE employees SET salary_increment_records = ?, gross_salary = ? WHERE id = ?',
            [JSON.stringify(incrementRecords), newGrossSalary, id]
        );

        await logActivity({
            userId: req.user.id,
            companyId: employee[0].company_id,
            action: 'CREATE',
            entityType: 'salary_increment',
            entityId: parseInt(id),
            description: `Added salary increment: ₹${increasedAmount.toLocaleString()} on ${date}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ 
            message: 'Salary increment added successfully',
            salary_increment: newIncrementRecord,
            new_gross_salary: newGrossSalary
        });
    } catch (error) {
        console.error('Add salary increment error:', error);
        res.status(500).json({ error: 'Failed to add salary increment' });
    }
});

// Get single employee
router.get('/:id', authenticateToken, checkEmployeeAccess, paramValidation.id, validate, async (req, res) => {
    try {
        const { id } = req.params;
        const { decrypt_sensitive } = req.query;

        const [employees] = await pool.query(
            `SELECT e.*, c.name as company_name, c.code as company_code,
                    u1.first_name as created_by_name, u2.first_name as updated_by_name
             FROM employees e
             JOIN companies c ON e.company_id = c.id
             LEFT JOIN users u1 ON e.created_by = u1.id
             LEFT JOIN users u2 ON e.updated_by = u2.id
             WHERE e.id = ?`,
            [id]
        );

        if (employees.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const employee = employees[0];

        // Decrypt or mask sensitive data
        if (decrypt_sensitive === 'true' && req.user.role === 'SUPER_ADMIN') {
            // Only Super Admin can see decrypted data
            employee.aadhaar_number = decrypt(employee.aadhaar_number_encrypted);
            employee.bank_account = decrypt(employee.bank_account_encrypted);
        } else {
            // Mask for everyone else
            const aadhaar = decrypt(employee.aadhaar_number_encrypted);
            const bank = decrypt(employee.bank_account_encrypted);
            employee.aadhaar_number = aadhaar ? maskAadhaar(aadhaar) : null;
            employee.bank_account = bank ? maskBankAccount(bank) : null;
        }

        // Remove encrypted fields from response
        delete employee.aadhaar_number_encrypted;
        delete employee.bank_account_encrypted;

        res.json(employee);
    } catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({ error: 'Failed to fetch employee' });
    }
});


// Create employee
router.post('/', authenticateToken, authorize('SUPER_ADMIN', 'COMPANY_ADMIN'),
    uploadEmployeeFiles.fields([
        { name: 'profile_photo', maxCount: 1 },
        { name: 'aadhaar_attachment', maxCount: 1 },
        { name: 'driving_license_attachment', maxCount: 1 },
        { name: 'education_document', maxCount: 1 },
        { name: 'employment_document', maxCount: 1 },
        { name: 'bank_passbook_attachment', maxCount: 1 },
        { name: 'signature', maxCount: 1 }
    ]),
    handleUploadError,
    async (req, res) => {
    try {
        // SQLite: Begin transaction
        await pool.query('BEGIN TRANSACTION');

        const {
            company_id, first_name, last_name, father_name, mother_name, spouse_name,
            number_of_children, children_names,
            date_of_birth, gender, marital_status, blood_group, nationality, religion,
            medical_details,
            mobile, alternate_mobile, email, personal_email,
            temporary_address, permanent_address,
            emergency_contact, emergency_contact_name, emergency_contact_relation,
            aadhaar_number, pan_number, passport_number, driving_license, voter_id,
            account_holder_name, bank_name, bank_branch, bank_account, bank_ifsc,
            designation, department, employment_type, date_of_joining, 
            education_qualification, confirmation_date,
            basic_salary, home_allowance, food_allowance, transport_allowance, 
            medical_allowance, special_allowance,
            past_experience,
            reporting_person_name, reporting_person_role
        } = req.body;

        // Get uploaded file paths
        const files = req.files || {};
        const profile_photo = files.profile_photo ? getRelativePath(files.profile_photo[0].path) : null;
        const aadhaar_attachment = files.aadhaar_attachment ? getRelativePath(files.aadhaar_attachment[0].path) : null;
        const driving_license_attachment = files.driving_license_attachment ? getRelativePath(files.driving_license_attachment[0].path) : null;
        const education_attachment = files.education_document ? getRelativePath(files.education_document[0].path) : null;
        const employment_attachment = files.employment_document ? getRelativePath(files.employment_document[0].path) : null;
        const bank_passbook_attachment = files.bank_passbook_attachment ? getRelativePath(files.bank_passbook_attachment[0].path) : null;
        const signature = files.signature ? getRelativePath(files.signature[0].path) : null;

        // Convert company_id to integer for proper comparison
        const companyIdInt = parseInt(company_id);

        // Check company access
        if (req.user.role !== 'SUPER_ADMIN' && req.user.company_id !== companyIdInt) {
            await pool.query('ROLLBACK');
            return res.status(403).json({ error: 'Access denied to this company' });
        }

        // Generate employee ID
        const [company] = await pool.query('SELECT code FROM companies WHERE id = ?', [companyIdInt]);
        if (company.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ error: 'Company not found' });
        }

        // Get next sequence
        const [seq] = await pool.query(
            'SELECT last_sequence, prefix FROM employee_sequences WHERE company_id = ?',
            [company_id]
        );

        let employeeId;
        if (seq.length === 0) {
            await pool.query(
                'INSERT INTO employee_sequences (company_id, last_sequence, prefix) VALUES (?, 1, ?)',
                [company_id, company[0].code.substring(0, 3)]
            );
            employeeId = `${company[0].code.substring(0, 3)}-${new Date().getFullYear()}-0001`;
        } else {
            const nextSeq = seq[0].last_sequence + 1;
            await pool.query(
                'UPDATE employee_sequences SET last_sequence = ? WHERE company_id = ?',
                [nextSeq, company_id]
            );
            employeeId = `${seq[0].prefix}-${new Date().getFullYear()}-${String(nextSeq).padStart(4, '0')}`;
        }

        // Encrypt sensitive data
        const aadhaarEncrypted = aadhaar_number ? encrypt(aadhaar_number) : null;
        const bankAccountEncrypted = bank_account ? encrypt(bank_account) : null;
        
        // Combine father/guardian into single field
        const fatherOrGuardian = father_name || null;

        // Parse children names if provided
        let childrenNamesJSON = null;
        if (children_names) {
            try {
                childrenNamesJSON = typeof children_names === 'string' ? children_names : JSON.stringify(children_names);
            } catch (e) {
                childrenNamesJSON = children_names;
            }
        }

        // Insert employee (SQLite schema with new fields)
        const [result] = await pool.query(
            `INSERT INTO employees (
                employee_id, company_id, first_name, last_name, father_or_guardian, mother_name, spouse_name,
                number_of_children, children_names,
                date_of_birth, gender, marital_status, blood_group, nationality, religion,
                medical_details,
                mobile, alternate_mobile, email, personal_email,
                temp_address, perm_address,
                aadhaar_number_encrypted, aadhaar_attachment, pan_number, passport_number, 
                driving_license, driving_license_attachment, voter_id,
                account_holder_name, bank_name, bank_branch, bank_account_encrypted, bank_ifsc, bank_passbook_attachment,
                designation, department, employment_type, date_of_joining, 
                education_qualification, education_attachment, employment_attachment, confirmation_date,
                basic_salary, home_allowance, food_allowance, transport_allowance,
                medical_allowance, special_allowance,
                gross_salary,
                emergency_contact_name, emergency_contact_relation, emergency_contact_phone,
                reporting_person_name, reporting_person_role,
                past_work_profiles,
                profile_photo,
                signature,
                created_by, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                employeeId, 
                company_id, 
                first_name, 
                last_name, 
                fatherOrGuardian, 
                mother_name || null, 
                spouse_name || null,
                number_of_children || 0, 
                childrenNamesJSON,
                date_of_birth, 
                gender, 
                marital_status || null, 
                blood_group || null, 
                nationality || 'Indian', 
                religion || null,
                medical_details || null,
                mobile, 
                alternate_mobile || null, 
                email, 
                personal_email || null,
                temporary_address || null, 
                permanent_address || null,
                aadhaarEncrypted, 
                aadhaar_attachment, 
                pan_number || null, 
                passport_number || null, 
                driving_license || null, 
                driving_license_attachment, 
                voter_id || null,
                account_holder_name || null, 
                bank_name || null, 
                bank_branch || null, 
                bankAccountEncrypted, 
                bank_ifsc || null, 
                bank_passbook_attachment,
                designation, 
                department || null, 
                employment_type || 'Full-time', 
                date_of_joining, 
                education_qualification || null, 
                education_attachment,
                employment_attachment, 
                confirmation_date || null,
                basic_salary || 0, 
                home_allowance || 0, 
                food_allowance || 0, 
                transport_allowance || 0,
                medical_allowance || 0, 
                special_allowance || 0,
                (basic_salary || 0) + (home_allowance || 0) + (food_allowance || 0) + (transport_allowance || 0) + (medical_allowance || 0) + (special_allowance || 0),
                emergency_contact_name || null, 
                emergency_contact_relation || null, 
                emergency_contact || null,
                reporting_person_name || null, 
                reporting_person_role || null,
                past_experience || null,
                profile_photo,
                signature,
                req.user.id, 
                'Active'
            ]
        );

        await pool.query('COMMIT');

        await logActivity({
            userId: req.user.id,
            companyId: company_id,
            action: 'CREATE',
            entityType: 'employee',
            entityId: result.insertId,
            description: `Created employee: ${first_name} ${last_name} (${employeeId})`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        const [newEmployee] = await pool.query('SELECT * FROM employees WHERE id = ?', [result.insertId]);
        res.status(201).json(newEmployee[0]);
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Create employee error:', error);
        res.status(500).json({ error: 'Failed to create employee', details: error.message });
    }
});

// Update employee
router.put('/:id', authenticateToken, authorize('SUPER_ADMIN', 'COMPANY_ADMIN'),
    checkEmployeeAccess,
    uploadEmployeeFiles.fields([
        { name: 'profile_photo', maxCount: 1 },
        { name: 'aadhaar_attachment', maxCount: 1 },
        { name: 'driving_license_attachment', maxCount: 1 },
        { name: 'education_document', maxCount: 1 },
        { name: 'employment_document', maxCount: 1 },
        { name: 'bank_passbook_attachment', maxCount: 1 },
        { name: 'signature', maxCount: 1 }
    ]),
    handleUploadError,
    paramValidation.id, async (req, res) => {
    try {
        const { id } = req.params;

        // Get current employee
        const [current] = await pool.query('SELECT * FROM employees WHERE id = ?', [id]);
        if (current.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const updates = [];
        const params = [];

        // Build dynamic update query - Map frontend fields to SQLite schema
        const fieldMapping = {
            'first_name': 'first_name',
            'last_name': 'last_name',
            'father_name': 'father_or_guardian',
            'father_or_guardian': 'father_or_guardian',
            'mother_name': 'mother_name',
            'spouse_name': 'spouse_name',
            'number_of_children': 'number_of_children',
            'children_names': 'children_names',
            'date_of_birth': 'date_of_birth',
            'gender': 'gender',
            'marital_status': 'marital_status',
            'blood_group': 'blood_group',
            'nationality': 'nationality',
            'religion': 'religion',
            'medical_details': 'medical_details',
            'mobile': 'mobile',
            'alternate_mobile': 'alternate_mobile',
            'email': 'email',
            'personal_email': 'personal_email',
            'temporary_address': 'temp_address',
            'temp_address': 'temp_address',
            'permanent_address': 'perm_address',
            'perm_address': 'perm_address',
            'pan_number': 'pan_number',
            'passport_number': 'passport_number',
            'driving_license_no': 'driving_license',
            'driving_license': 'driving_license',
            'voter_id': 'voter_id',
            'account_holder_name': 'account_holder_name',
            'bank_name': 'bank_name',
            'bank_branch': 'bank_branch',
            'bank_ifsc': 'bank_ifsc',
            'designation': 'designation',
            'department': 'department',
            'employment_type': 'employment_type',
            'date_of_joining': 'date_of_joining',
            'education_qualification': 'education_qualification',
            'confirmation_date': 'confirmation_date',
            'date_of_leaving': 'date_of_leaving',
            'last_day_of_work': 'last_day_of_work',
            'leaving_reason': 'leaving_reason',
            'final_payment': 'final_payment',
            'leaving_other_details': 'leaving_other_details',
            'basic_salary': 'basic_salary',
            'home_allowance': 'home_allowance',
            'food_allowance': 'food_allowance',
            'transport_allowance': 'transport_allowance',
            'medical_allowance': 'medical_allowance',
            'special_allowance': 'special_allowance',
            'emergency_contact': 'emergency_contact_phone',
            'emergency_contact_phone': 'emergency_contact_phone',
            'emergency_contact_name': 'emergency_contact_name',
            'emergency_contact_relation': 'emergency_contact_relation',
            'reporting_person_name': 'reporting_person_name',
            'reporting_person_role': 'reporting_person_role',
            'past_experience': 'past_work_profiles',
            'past_work_profiles': 'past_work_profiles',
            'training_records': 'training_records',
            'performance_records': 'performance_records',
            'leave_records': 'leave_records',
            'status': 'status'
        };

        // Only update fields that are in the mapping
        Object.keys(req.body).forEach(field => {
            if (fieldMapping[field] && req.body[field] !== undefined) {
                const dbColumn = fieldMapping[field];
                let value = req.body[field];
                
                // Handle children_names JSON conversion
                if (field === 'children_names' && value) {
                    try {
                        value = typeof value === 'string' ? value : JSON.stringify(value);
                    } catch (e) {
                        // Keep as is if JSON parse fails
                    }
                }
                
                // Avoid duplicates
                if (!updates.includes(`${dbColumn} = ?`)) {
                    updates.push(`${dbColumn} = ?`);
                    params.push(value);
                }
            }
        });

        // Handle file uploads
        const files = req.files || {};
        if (files.profile_photo) {
            // Delete old photo if exists
            if (current[0].profile_photo) {
                await deleteFile(current[0].profile_photo).catch(err => console.error('Error deleting old photo:', err));
            }
            updates.push('profile_photo = ?');
            params.push(getRelativePath(files.profile_photo[0].path));
        }
        if (files.aadhaar_attachment) {
            if (current[0].aadhaar_attachment) {
                await deleteFile(current[0].aadhaar_attachment).catch(err => console.error('Error deleting old aadhaar:', err));
            }
            updates.push('aadhaar_attachment = ?');
            params.push(getRelativePath(files.aadhaar_attachment[0].path));
        }
        if (files.driving_license_attachment) {
            if (current[0].driving_license_attachment) {
                await deleteFile(current[0].driving_license_attachment).catch(err => console.error('Error deleting old license:', err));
            }
            updates.push('driving_license_attachment = ?');
            params.push(getRelativePath(files.driving_license_attachment[0].path));
        }
        if (files.bank_passbook_attachment) {
            if (current[0].bank_passbook_attachment) {
                await deleteFile(current[0].bank_passbook_attachment).catch(err => console.error('Error deleting old bank doc:', err));
            }
            updates.push('bank_passbook_attachment = ?');
            params.push(getRelativePath(files.bank_passbook_attachment[0].path));
        }
        if (files.education_document) {
            if (current[0].education_attachment) {
                await deleteFile(current[0].education_attachment).catch(err => console.error('Error deleting old edu doc:', err));
            }
            updates.push('education_attachment = ?');
            params.push(getRelativePath(files.education_document[0].path));
        }
        if (files.employment_document) {
            if (current[0].employment_attachment) {
                await deleteFile(current[0].employment_attachment).catch(err => console.error('Error deleting old employment doc:', err));
            }
            updates.push('employment_attachment = ?');
            params.push(getRelativePath(files.employment_document[0].path));
        }
        if (files.signature) {
            if (current[0].signature) {
                await deleteFile(current[0].signature).catch(err => console.error('Error deleting old signature:', err));
            }
            updates.push('signature = ?');
            params.push(getRelativePath(files.signature[0].path));
        }

        // Handle encrypted fields
        if (req.body.aadhaar_number) {
            updates.push('aadhaar_number_encrypted = ?');
            params.push(encrypt(req.body.aadhaar_number));
        }

        if (req.body.bank_account) {
            updates.push('bank_account_encrypted = ?');
            params.push(encrypt(req.body.bank_account));
        }

        updates.push('updated_by = ?');
        params.push(req.user.id);

        // Check if any salary-related fields are being updated
        const salaryFields = ['basic_salary', 'home_allowance', 'food_allowance', 'transport_allowance', 'medical_allowance', 'special_allowance'];
        const hasSalaryUpdate = Object.keys(req.body).some(field => salaryFields.includes(fieldMapping[field] || field));
        
        if (hasSalaryUpdate) {
            // Recalculate gross_salary
            const basic = req.body.basic_salary !== undefined ? parseFloat(req.body.basic_salary) || 0 : parseFloat(current[0].basic_salary) || 0;
            const home = req.body.home_allowance !== undefined ? parseFloat(req.body.home_allowance) || 0 : parseFloat(current[0].home_allowance) || 0;
            const food = req.body.food_allowance !== undefined ? parseFloat(req.body.food_allowance) || 0 : parseFloat(current[0].food_allowance) || 0;
            const transport = req.body.transport_allowance !== undefined ? parseFloat(req.body.transport_allowance) || 0 : parseFloat(current[0].transport_allowance) || 0;
            const medical = req.body.medical_allowance !== undefined ? parseFloat(req.body.medical_allowance) || 0 : parseFloat(current[0].medical_allowance) || 0;
            const special = req.body.special_allowance !== undefined ? parseFloat(req.body.special_allowance) || 0 : parseFloat(current[0].special_allowance) || 0;
            
            const newGrossSalary = basic + home + food + transport + medical + special;
            updates.push('gross_salary = ?');
            params.push(newGrossSalary);
        }

        if (updates.length === 1) { // Only updated_by
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id);
        
        const updateQuery = `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`;
        console.log('Update query:', updateQuery);
        console.log('Update params:', params);
        
        await pool.query(updateQuery, params);

        await logActivity({
            userId: req.user.id,
            companyId: current[0].company_id,
            action: 'UPDATE',
            entityType: 'employee',
            entityId: parseInt(id),
            description: `Updated employee: ${current[0].first_name} ${current[0].last_name}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        const [updated] = await pool.query('SELECT * FROM employees WHERE id = ?', [id]);
        res.json(updated[0]);
    } catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({ error: 'Failed to update employee' });
    }
});

// Upload employee profile photo
router.post('/:id/photo', authenticateToken, authorize('SUPER_ADMIN', 'COMPANY_ADMIN'),
    checkEmployeeAccess, paramValidation.id, validate,
    uploadProfilePhoto.single('photo'), handleUploadError, async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const [current] = await pool.query('SELECT profile_photo, company_id FROM employees WHERE id = ?', [id]);
        if (current.length > 0 && current[0].profile_photo) {
            await deleteFile(current[0].profile_photo);
        }

        const photoPath = getRelativePath(req.file.path);

        await pool.query('UPDATE employees SET profile_photo = ? WHERE id = ?', [photoPath, id]);

        await logActivity({
            userId: req.user.id,
            companyId: current[0].company_id,
            action: 'UPLOAD',
            entityType: 'employee',
            entityId: parseInt(id),
            description: 'Updated employee photo',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ message: 'Photo uploaded successfully', profile_photo: photoPath });
    } catch (error) {
        console.error('Upload photo error:', error);
        res.status(500).json({ error: 'Failed to upload photo' });
    }
});

// Delete employee
// Terminate employee (soft delete with termination details)
router.put('/:id/terminate', authenticateToken, authorize('SUPER_ADMIN', 'COMPANY_ADMIN'),
    checkEmployeeAccess, paramValidation.id, validate, 
    upload.fields([{ name: 'leaving_attachment', maxCount: 1 }]),
    async (req, res) => {
    try {
        const { id } = req.params;
        const { last_day_of_work, leaving_reason, final_payment, leaving_other_details } = req.body;

        const [employee] = await pool.query('SELECT * FROM employees WHERE id = ?', [id]);
        if (employee.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        if (employee[0].status === 'Terminated') {
            return res.status(400).json({ error: 'Employee is already terminated' });
        }

        // Handle leaving attachment file upload
        let leavingAttachmentPath = employee[0].leaving_attachment;
        if (req.files && req.files.leaving_attachment) {
            leavingAttachmentPath = req.files.leaving_attachment[0].path.replace(/\\/g, '/');
        }

        // Update employee status to Terminated and save termination details
        await pool.query(
            `UPDATE employees 
             SET status = 'Terminated',
                 last_day_of_work = ?,
                 leaving_reason = ?,
                 final_payment = ?,
                 leaving_other_details = ?,
                 leaving_attachment = ?,
                 date_of_leaving = ?
             WHERE id = ?`,
            [
                last_day_of_work || null,
                leaving_reason || null,
                final_payment || null,
                leaving_other_details || null,
                leavingAttachmentPath,
                last_day_of_work || new Date().toISOString().split('T')[0],
                id
            ]
        );

        await logActivity({
            userId: req.user.id,
            companyId: employee[0].company_id,
            action: 'UPDATE',
            entityType: 'employee',
            entityId: parseInt(id),
            description: `Terminated employee: ${employee[0].first_name} ${employee[0].last_name}. Reason: ${leaving_reason || 'Not specified'}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ 
            message: 'Employee terminated successfully',
            employee: {
                id,
                status: 'Terminated',
                last_day_of_work,
                leaving_reason
            }
        });
    } catch (error) {
        console.error('Terminate employee error:', error);
        res.status(500).json({ error: 'Failed to terminate employee' });
    }
});

// Reactivate terminated employee (only Super Admin)
router.put('/:id/reactivate', authenticateToken, authorize('SUPER_ADMIN'),
    paramValidation.id, validate, async (req, res) => {
    try {
        const { id } = req.params;

        const [employee] = await pool.query('SELECT * FROM employees WHERE id = ?', [id]);
        if (employee.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        if (employee[0].status !== 'Terminated') {
            return res.status(400).json({ error: 'Employee is not terminated' });
        }

        // Update employee status back to Active and clear termination details
        await pool.query(
            `UPDATE employees 
             SET status = 'Active',
                 last_day_of_work = NULL,
                 leaving_reason = NULL,
                 final_payment = NULL,
                 leaving_other_details = NULL,
                 leaving_attachment = NULL,
                 date_of_leaving = NULL
             WHERE id = ?`,
            [id]
        );

        await logActivity({
            userId: req.user.id,
            companyId: employee[0].company_id,
            action: 'UPDATE',
            entityType: 'employee',
            entityId: parseInt(id),
            description: `Reactivated employee: ${employee[0].first_name} ${employee[0].last_name}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ 
            message: 'Employee reactivated successfully',
            employee: {
                id,
                status: 'Active'
            }
        });
    } catch (error) {
        console.error('Reactivate employee error:', error);
        res.status(500).json({ error: 'Failed to reactivate employee' });
    }
});

router.delete('/:id', authenticateToken, authorize('SUPER_ADMIN', 'COMPANY_ADMIN'),
    checkEmployeeAccess, paramValidation.id, validate, async (req, res) => {
    try {
        const { id } = req.params;

        const [employee] = await pool.query('SELECT * FROM employees WHERE id = ?', [id]);
        if (employee.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        await pool.query('DELETE FROM employees WHERE id = ?', [id]);

        await logActivity({
            userId: req.user.id,
            companyId: employee[0].company_id,
            action: 'DELETE',
            entityType: 'employee',
            entityId: parseInt(id),
            description: `Deleted employee: ${employee[0].first_name} ${employee[0].last_name}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({ error: 'Failed to delete employee' });
    }
});

module.exports = router;
