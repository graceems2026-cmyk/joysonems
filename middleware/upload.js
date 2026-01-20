const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB

// Allowed file types
const ALLOWED_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    document: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    excel: ['application/vnd.ms-excel', 
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
};

// Create directory if not exists
const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// Generate secure filename
const generateSecureFilename = (originalName) => {
    const ext = path.extname(originalName).toLowerCase();
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    return `${timestamp}-${uniqueId}${ext}`;
};

// Storage configuration for employee documents and photos
const employeeStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const companyId = req.user?.company_id || req.body?.company_id || 'temp';
        const employeeId = req.params.id || req.body?.employee_id || 'new';
        
        // Determine subfolder based on field name
        let subfolder;
        if (file.fieldname === 'profile_photo') {
            subfolder = 'profile';
        } else if (file.fieldname === 'aadhaar_photo') {
            subfolder = 'aadhaar';
        } else if (file.fieldname === 'bank_document') {
            subfolder = 'bank';
        } else if (file.fieldname === 'education_document') {
            subfolder = 'education';
        } else if (file.fieldname === 'license_document') {
            subfolder = 'license';
        } else if (file.fieldname === 'signature') {
            subfolder = 'signature';
        } else {
            subfolder = 'documents';
        }
        
        const uploadPath = path.join(UPLOAD_DIR, 'employees', String(companyId), String(employeeId), subfolder);
        ensureDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, generateSecureFilename(file.originalname));
    }
});

// Storage configuration for employee documents
const employeeDocStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const companyId = req.user?.company_id || req.body?.company_id || 'temp';
        const employeeId = req.params.employeeId || req.body?.employee_id || 'temp';
        const uploadPath = path.join(UPLOAD_DIR, String(companyId), String(employeeId), 'documents');
        ensureDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, generateSecureFilename(file.originalname));
    }
});

// Storage configuration for profile photos
const profilePhotoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const companyId = req.user?.company_id || req.body?.company_id || 'temp';
        const employeeId = req.params.employeeId || req.params.id || 'temp';
        const uploadPath = path.join(UPLOAD_DIR, String(companyId), String(employeeId), 'photos');
        ensureDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, generateSecureFilename(file.originalname));
    }
});

// Storage configuration for company logos
const companyLogoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const companyId = req.params.id || req.body?.company_id || 'temp';
        const uploadPath = path.join(UPLOAD_DIR, 'companies', String(companyId));
        ensureDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, generateSecureFilename(file.originalname));
    }
});

// File filter for images
const imageFilter = (req, file, cb) => {
    if (ALLOWED_TYPES.image.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'), false);
    }
};

// File filter for documents
const documentFilter = (req, file, cb) => {
    if (ALLOWED_TYPES.document.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF, Word, and image files are allowed'), false);
    }
};

// Multer instances
// Multi-field upload for employee registration (profile + documents)
const uploadEmployeeFiles = multer({
    storage: employeeStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        // Profile photo must be an image
        if (file.fieldname === 'profile_photo') {
            if (ALLOWED_TYPES.image.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Profile photo must be an image file (JPEG, PNG, GIF, WebP)'), false);
            }
        }
        // Documents can be PDF or images
        else if (ALLOWED_TYPES.document.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Documents must be PDF, Word, or image files'), false);
        }
    }
});

const uploadEmployeeDoc = multer({
    storage: employeeDocStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: documentFilter
});

const uploadProfilePhoto = multer({
    storage: profilePhotoStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for photos
    fileFilter: imageFilter
});

const uploadCompanyLogo = multer({
    storage: companyLogoStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for logos
    fileFilter: imageFilter
});

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
        return res.status(400).json({ error: err.message });
    } else if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
};

// Delete file utility
const deleteFile = (filePath) => {
    return new Promise((resolve, reject) => {
        if (!filePath) {
            resolve(true);
            return;
        }
        
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
        
        fs.unlink(fullPath, (err) => {
            if (err && err.code !== 'ENOENT') {
                console.error('Error deleting file:', err);
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
};

// Get file path relative to upload directory
const getRelativePath = (absolutePath) => {
    return path.relative(process.cwd(), absolutePath).replace(/\\/g, '/');
};

module.exports = {
    uploadEmployeeDoc,
    uploadProfilePhoto,
    uploadCompanyLogo,
    uploadEmployeeFiles,
    handleUploadError,
    deleteFile,
    getRelativePath,
    ensureDir,
    UPLOAD_DIR,
    ALLOWED_TYPES
};
