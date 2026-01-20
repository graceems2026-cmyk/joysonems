const mysql = require('mysql2/promise');

async function viewTables() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'employee_management',
        port: 3306
    });

    try {
        console.log('\n📊 DATABASE TABLES\n');
        console.log('='.repeat(80));

        // Show all tables
        const [tables] = await connection.query('SHOW TABLES');
        console.log('\n✅ Available Tables:');
        tables.forEach((table, i) => {
            console.log(`   ${i + 1}. ${Object.values(table)[0]}`);
        });

        // Show companies
        console.log('\n\n📋 COMPANIES TABLE:');
        console.log('='.repeat(80));
        const [companies] = await connection.query('SELECT * FROM companies');
        console.table(companies);

        // Show employees
        console.log('\n\n👥 EMPLOYEES TABLE:');
        console.log('='.repeat(80));
        const [employees] = await connection.query(`
            SELECT e.id, e.employee_id, e.first_name, e.last_name, 
                   c.name as company, e.department, e.designation, 
                   e.status, e.date_of_joining
            FROM employees e
            JOIN companies c ON e.company_id = c.id
            ORDER BY e.id
        `);
        console.table(employees);

        // Show users
        console.log('\n\n🔐 USERS TABLE:');
        console.log('='.repeat(80));
        const [users] = await connection.query(`
            SELECT u.id, u.email, u.first_name, u.last_name, u.role, 
                   c.name as company, u.is_active, u.last_login
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            ORDER BY u.id
        `);
        console.table(users);

        // Show activity logs
        console.log('\n\n📝 ACTIVITY LOGS (Last 20):');
        console.log('='.repeat(80));
        const [logs] = await connection.query(`
            SELECT al.id, al.action, al.entity_type, 
                   CONCAT(u.first_name, ' ', u.last_name) as user_name,
                   al.description, al.created_at
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT 20
        `);
        console.table(logs);

        // Show table counts
        console.log('\n\n📊 TABLE COUNTS:');
        console.log('='.repeat(80));
        const [companiesCount] = await connection.query('SELECT COUNT(*) as count FROM companies');
        const [employeesCount] = await connection.query('SELECT COUNT(*) as count FROM employees');
        const [usersCount] = await connection.query('SELECT COUNT(*) as count FROM users');
        const [logsCount] = await connection.query('SELECT COUNT(*) as count FROM activity_logs');
        
        console.log(`   Companies:     ${companiesCount[0].count}`);
        console.log(`   Employees:     ${employeesCount[0].count}`);
        console.log(`   Users:         ${usersCount[0].count}`);
        console.log(`   Activity Logs: ${logsCount[0].count}`);
        console.log('\n' + '='.repeat(80) + '\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

viewTables();
