const express = require('express');
const pool = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Get dashboard stats
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        let companyFilter = '';
        let params = [];

        if (req.user.role !== 'SUPER_ADMIN') {
            companyFilter = 'WHERE company_id = ?';
            params = [req.user.company_id];
        }

        // For Super Admin - all companies stats
        if (req.user.role === 'SUPER_ADMIN') {
            // SQLite-compatible stats
            const [stats] = await pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM companies WHERE is_active = 1) as total_companies,
                    (SELECT COUNT(*) FROM employees WHERE status = 'Active') as total_employees,
                    (SELECT COALESCE(SUM(gross_salary), 0) FROM employees WHERE status = 'Active') as total_salary,
                    (SELECT COUNT(*) FROM employees WHERE strftime('%m', date_of_joining) = strftime('%m','now') AND strftime('%Y', date_of_joining) = strftime('%Y','now')) as new_joinings_this_month,
                    (SELECT COUNT(*) FROM employees WHERE status = 'On Leave') as employees_on_leave,
                    (SELECT COUNT(*) FROM employee_documents WHERE is_verified = 0) as pending_verifications,
                    (SELECT COUNT(DISTINCT company_id) FROM employees WHERE strftime('%m', date_of_joining) = strftime('%m','now') AND strftime('%Y', date_of_joining) = strftime('%Y','now')) as companies_with_new_joinings
            `);

            // Get company-wise employee distribution
            const [companyDistribution] = await pool.query(`
                SELECT c.name, c.code, COUNT(e.id) as employee_count,
                       COALESCE(SUM(e.gross_salary), 0) as total_salary
                FROM companies c
                LEFT JOIN employees e ON c.id = e.company_id AND e.status = 'Active'
                WHERE c.is_active = 1
                GROUP BY c.id, c.name, c.code
                ORDER BY employee_count DESC
            `);

            // Get monthly joining trend (last 6 months)
            const [monthlyJoinings] = await pool.query(`
                SELECT 
                    strftime('%Y-%m', date_of_joining) as month,
                    COUNT(*) as count
                FROM employees
                WHERE date(date_of_joining) >= date('now','-6 months')
                GROUP BY strftime('%Y-%m', date_of_joining)
                ORDER BY month DESC
                LIMIT 6
            `);

            // Department distribution
            const [departmentDistribution] = await pool.query(`
                SELECT department, COUNT(*) as count
                FROM employees
                WHERE status = 'Active' AND department IS NOT NULL
                GROUP BY department
                ORDER BY count DESC
                LIMIT 10
            `);

            res.json({
                ...stats[0],
                company_distribution: companyDistribution,
                monthly_joinings: monthlyJoinings.reverse(),
                department_distribution: departmentDistribution
            });
        } else {
            // For Company Admin - their company stats
            const [stats] = await pool.query(`
                SELECT 
                    (SELECT name FROM companies WHERE id = ?) as company_name,
                    (SELECT COUNT(*) FROM employees WHERE company_id = ? AND status = 'Active') as total_employees,
                    (SELECT COALESCE(SUM(gross_salary), 0) FROM employees WHERE company_id = ? AND status = 'Active') as total_salary,
                    (SELECT COUNT(*) FROM employees WHERE company_id = ? 
                        AND strftime('%m', date_of_joining) = strftime('%m','now') 
                        AND strftime('%Y', date_of_joining) = strftime('%Y','now')) as new_joinings_this_month,
                    (SELECT COUNT(*) FROM employees WHERE company_id = ? AND status = 'On Leave') as employees_on_leave,
                    (SELECT COUNT(*) FROM employee_documents ed
                        JOIN employees e ON ed.employee_id = e.id
                        WHERE e.company_id = ? AND ed.is_verified = 0) as pending_verifications,
                    (SELECT COUNT(*) FROM employees WHERE company_id = ? AND status = 'Inactive') as inactive_employees
            `, [params[0], params[0], params[0], params[0], params[0], params[0], params[0]]);

            // Department distribution for this company
            const [departmentDistribution] = await pool.query(`
                SELECT department, COUNT(*) as count,
                       COALESCE(SUM(gross_salary), 0) as total_salary
                FROM employees
                WHERE company_id = ? AND status = 'Active' AND department IS NOT NULL
                GROUP BY department
                ORDER BY count DESC
            `, params);

            // Designation distribution
            const [designationDistribution] = await pool.query(`
                SELECT designation, COUNT(*) as count
                FROM employees
                WHERE company_id = ? AND status = 'Active' AND designation IS NOT NULL
                GROUP BY designation
                ORDER BY count DESC
                LIMIT 10
            `, params);

            // Monthly joining trend for this company
            const [monthlyJoinings] = await pool.query(`
                SELECT 
                    strftime('%Y-%m', date_of_joining) as month,
                    strftime('%Y-%m', date_of_joining) as month_label,
                    COUNT(*) as count
                FROM employees
                WHERE company_id = ? AND date(date_of_joining) >= date('now','-6 months')
                GROUP BY strftime('%Y-%m', date_of_joining)
                ORDER BY month DESC
                LIMIT 6
            `, params);

            // Gender distribution
            const [genderDistribution] = await pool.query(`
                SELECT gender, COUNT(*) as count
                FROM employees
                WHERE company_id = ? AND status = 'Active' AND gender IS NOT NULL
                GROUP BY gender
            `, params);

            res.json({
                ...stats[0],
                department_distribution: departmentDistribution,
                designation_distribution: designationDistribution,
                monthly_joinings: monthlyJoinings.reverse(),
                gender_distribution: genderDistribution
            });
        }
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

// Get salary analytics
router.get('/salary-analytics', authenticateToken, async (req, res) => {
    try {
        let params = [];
        let companyFilter = '';

        if (req.user.role !== 'SUPER_ADMIN') {
            companyFilter = 'WHERE company_id = ?';
            params = [req.user.company_id];
        }

        // Always add status filter
        const whereClause = companyFilter
            ? `${companyFilter} AND status = 'Active'`
            : `WHERE status = 'Active'`;

        const [salaryStats] = await pool.query(`
            SELECT 
                COUNT(*) as total_employees,
                COALESCE(AVG(gross_salary), 0) as average_salary,
                COALESCE(MIN(gross_salary), 0) as min_salary,
                COALESCE(MAX(gross_salary), 0) as max_salary,
                COALESCE(SUM(gross_salary), 0) as total_salary
            FROM employees
            ${whereClause}
        `, params);

        // Salary range distribution
        const [salaryRanges] = await pool.query(`
            SELECT 
                CASE 
                    WHEN gross_salary < 30000 THEN '< 30K'
                    WHEN gross_salary BETWEEN 30000 AND 50000 THEN '30K - 50K'
                    WHEN gross_salary BETWEEN 50001 AND 75000 THEN '50K - 75K'
                    WHEN gross_salary BETWEEN 75001 AND 100000 THEN '75K - 100K'
                    ELSE '> 100K'
                END as salary_range,
                COUNT(*) as count
            FROM employees
            ${whereClause}
            GROUP BY salary_range
            ORDER BY MIN(gross_salary)
        `, params);

        // Always return a valid response, even if empty
        res.json({
            total_employees: salaryStats[0]?.total_employees || 0,
            average_salary: salaryStats[0]?.average_salary || 0,
            min_salary: salaryStats[0]?.min_salary || 0,
            max_salary: salaryStats[0]?.max_salary || 0,
            total_salary: salaryStats[0]?.total_salary || 0,
            salary_ranges: Array.isArray(salaryRanges) ? salaryRanges : []
        });
    } catch (error) {
        console.error('Get salary analytics error:', error);
        res.status(200).json({
            total_employees: 0,
            average_salary: 0,
            min_salary: 0,
            max_salary: 0,
            total_salary: 0,
            salary_ranges: []
        });
    }
});

// Get document verification stats
router.get('/document-stats', authenticateToken, async (req, res) => {
    try {
        let params = [];
        let companyJoin = '';

        if (req.user.role !== 'SUPER_ADMIN') {
            companyJoin = 'JOIN employees e ON ed.employee_id = e.id WHERE e.company_id = ?';
            params = [req.user.company_id];
        }

        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_documents,
                SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_documents,
                SUM(CASE WHEN is_verified = 0 THEN 1 ELSE 0 END) as pending_documents,
                COUNT(DISTINCT employee_id) as employees_with_documents
            FROM employee_documents ed
            ${companyJoin}
        `, params);

        // Document type distribution
        const [typeDistribution] = await pool.query(`
                 SELECT document_type, 
                     COUNT(*) as count,
                     SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_count
            FROM employee_documents ed
            ${companyJoin}
            GROUP BY document_type
            ORDER BY count DESC
        `, params);

        res.json({
            ...stats[0],
            document_types: typeDistribution
        });
    } catch (error) {
        console.error('Get document stats error:', error);
        res.status(500).json({ error: 'Failed to fetch document statistics' });
    }
});

// Get recent activity summary
router.get('/recent-activity', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        let params = [limit];
        let companyFilter = '';

        if (req.user.role !== 'SUPER_ADMIN') {
            companyFilter = 'WHERE company_id = ?';
            params = [req.user.company_id, limit];
        }

        const [activities] = await pool.query(`
            SELECT al.*, u.first_name, u.last_name, u.email
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ${companyFilter}
            ORDER BY al.created_at DESC
            LIMIT ?
        `, params);

        res.json(activities);
    } catch (error) {
        console.error('Get recent activity error:', error);
        res.status(500).json({ error: 'Failed to fetch recent activity' });
    }
});

// Get employee status distribution
router.get('/employee-status', authenticateToken, async (req, res) => {
    try {
        let params = [];
        let companyFilter = '';

        if (req.user.role !== 'SUPER_ADMIN') {
            companyFilter = 'WHERE company_id = ?';
            params = [req.user.company_id];
        }

        const [statusDistribution] = await pool.query(`
            SELECT status, COUNT(*) as count
            FROM employees
            ${companyFilter}
            GROUP BY status
            ORDER BY count DESC
        `, params);

        res.json(statusDistribution);
    } catch (error) {
        console.error('Get employee status error:', error);
        res.status(500).json({ error: 'Failed to fetch employee status distribution' });
    }
});

// Get year-wise joining statistics
router.get('/yearly-joinings', authenticateToken, async (req, res) => {
    try {
        let params = [];
        let companyFilter = '';

        if (req.user.role !== 'SUPER_ADMIN') {
            companyFilter = 'WHERE company_id = ?';
            params = [req.user.company_id];
        }

        const [yearlyStats] = await pool.query(`
            SELECT 
                YEAR(date_of_joining) as year,
                COUNT(*) as count,
                COALESCE(AVG(gross_salary), 0) as avg_salary
            FROM employees
            ${companyFilter}
            GROUP BY YEAR(date_of_joining)
            ORDER BY year DESC
            LIMIT 5
        `, params);

        res.json(yearlyStats);
    } catch (error) {
        console.error('Get yearly joinings error:', error);
        res.status(500).json({ error: 'Failed to fetch yearly joining statistics' });
    }
});

module.exports = router;
