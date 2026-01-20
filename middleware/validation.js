const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// User validation rules
const userValidation = {
    login: [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    create: [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage('Password must contain uppercase, lowercase, number and special character'),
        body('first_name').notEmpty().trim().withMessage('First name is required'),
        body('role').isIn(['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'VIEWER', 'AUDITOR'])
            .withMessage('Invalid role')
    ],
    update: [
        body('email').optional().isEmail().withMessage('Valid email is required'),
        body('first_name').optional().notEmpty().trim().withMessage('First name cannot be empty'),
        body('role').optional().isIn(['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'VIEWER', 'AUDITOR'])
            .withMessage('Invalid role')
    ]
};

// Company validation rules
const companyValidation = {
    create: [
        body('name').notEmpty().trim().withMessage('Company name is required'),
        body('code').notEmpty().trim()
            .isLength({ min: 2, max: 10 }).withMessage('Company code must be 2-10 characters'),
        body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
        body('phone').optional({ checkFalsy: true }),
        body('gst_number').optional({ checkFalsy: true }).matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
            .withMessage('Invalid GST number format')
    ],
    update: [
        body('name').optional().notEmpty().trim().withMessage('Company name cannot be empty'),
        body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
        body('phone').optional({ checkFalsy: true })
    ]
};

// Employee validation rules
const employeeValidation = {
    create: [
        body('company_id').isInt().withMessage('Valid company ID is required'),
        body('first_name').notEmpty().trim().withMessage('First name is required'),
        body('mobile').notEmpty().withMessage('Mobile number is required'),
        body('date_of_joining').isDate().withMessage('Valid date of joining is required'),
        body('email').optional().isEmail().withMessage('Valid email is required'),
        body('date_of_birth').optional().isDate().withMessage('Valid date of birth is required'),
        body('basic_salary').optional().isFloat({ min: 0 }).withMessage('Salary must be a positive number'),
        body('aadhaar_number').optional().matches(/^[0-9]{12}$/).withMessage('Aadhaar must be 12 digits')
    ],
    update: [
        body('first_name').optional().notEmpty().trim().withMessage('First name cannot be empty'),
        body('email').optional().isEmail().withMessage('Valid email is required'),
        body('date_of_birth').optional().isDate().withMessage('Valid date of birth is required'),
        body('basic_salary').optional().isFloat({ min: 0 }).withMessage('Salary must be a positive number')
    ]
};

// Document validation rules
const documentValidation = {
    upload: [
        body('document_type').isIn([
            'aadhaar', 'pan', 'passport', 'driving_license', 'voter_id',
            'bank_passbook', 'bank_statement', 'cancelled_cheque',
            'education_10th', 'education_12th', 'education_graduation',
            'education_post_graduation', 'education_diploma', 'education_other',
            'experience_letter', 'relieving_letter', 'salary_slip',
            'photo', 'resume', 'offer_letter', 'appointment_letter',
            'address_proof', 'other'
        ]).withMessage('Invalid document type')
    ]
};

// Common parameter validations
const paramValidation = {
    id: [
        param('id').isInt().withMessage('Valid ID is required')
    ]
};

// Query parameter validations
const queryValidation = {
    pagination: [
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ],
    search: [
        query('search').optional().trim().escape()
    ]
};

module.exports = {
    validate,
    userValidation,
    companyValidation,
    employeeValidation,
    documentValidation,
    paramValidation,
    queryValidation
};
