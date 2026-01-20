// Format date for display
const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().split('T')[0];
};

// Format date with time
const formatDateTime = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().replace('T', ' ').substring(0, 19);
};

// Format currency
const formatCurrency = (amount, currency = 'INR') => {
    if (amount === null || amount === undefined) return null;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency
    }).format(amount);
};

// Parse pagination parameters
const parsePagination = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
};

// Build pagination response
const buildPaginationResponse = (data, total, page, limit) => {
    const totalPages = Math.ceil(total / limit);
    return {
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        }
    };
};

// Build search query
const buildSearchQuery = (searchTerm, fields) => {
    if (!searchTerm || !fields.length) return { where: '', params: [] };
    
    const conditions = fields.map(field => `${field} LIKE ?`);
    const params = fields.map(() => `%${searchTerm}%`);
    
    return {
        where: `(${conditions.join(' OR ')})`,
        params
    };
};

// Generate employee ID
const generateEmployeeId = (companyCode, sequence) => {
    const year = new Date().getFullYear();
    const paddedSequence = String(sequence).padStart(4, '0');
    return `${companyCode.substring(0, 3).toUpperCase()}-${year}-${paddedSequence}`;
};

// Calculate age from date of birth
const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
};

// Calculate years of service
const calculateYearsOfService = (dateOfJoining) => {
    if (!dateOfJoining) return 0;
    const doj = new Date(dateOfJoining);
    const today = new Date();
    const years = (today - doj) / (365.25 * 24 * 60 * 60 * 1000);
    return Math.floor(years * 10) / 10; // One decimal place
};

// Get month name
const getMonthName = (month) => {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
};

// Slugify string
const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

module.exports = {
    formatDate,
    formatDateTime,
    formatCurrency,
    parsePagination,
    buildPaginationResponse,
    buildSearchQuery,
    generateEmployeeId,
    calculateAge,
    calculateYearsOfService,
    getMonthName,
    slugify
};
