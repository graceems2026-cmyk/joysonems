// Complete MySQL to SQLite migration script
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const mysqlConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'employee_management'
};

const sqliteDbPath = path.join(__dirname, 'employees.db');

async function migrateMySQLToSQLite() {
    console.log('🔄 Creating complete SQLite database...\n');
    
    try {
        // Connect to MySQL
        const mysqlConn = await mysql.createConnection(mysqlConfig);
        console.log('✅ Connected to MySQL\n');
        
        // Create SQLite database
        const db = new sqlite3.Database(sqliteDbPath);
        console.log(`✅ Created SQLite database: ${sqliteDbPath}\n`);
        
        // Promisify
        const run = (sql, params = []) => new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
        
        console.log('📋 Creating tables...\n');
        
        // Enable foreign keys
        await run('PRAGMA foreign_keys = ON');
        
        // Create all tables
        await run(`
            CREATE TABLE companies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                code TEXT UNIQUE NOT NULL,
                address TEXT, city TEXT, state TEXT, pincode TEXT,
                country TEXT DEFAULT 'India',
                gst_number TEXT, pan_number TEXT, phone TEXT, email TEXT,
                website TEXT, logo_path TEXT, established_date TEXT,
                employee_count INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✓ companies');
        
        await run(`
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT,
                phone TEXT,
                role TEXT NOT NULL DEFAULT 'VIEWER',
                company_id INTEGER,
                profile_photo TEXT,
                is_active INTEGER DEFAULT 1,
                last_login TEXT,
                password_changed_at TEXT,
                failed_login_attempts INTEGER DEFAULT 0,
                locked_until TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (company_id) REFERENCES companies(id)
            )
        `);
        console.log('  ✓ users');
        
        await run(`
            CREATE TABLE employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT UNIQUE NOT NULL,
                company_id INTEGER NOT NULL,
                first_name TEXT NOT NULL, last_name TEXT,
                father_or_guardian TEXT, date_of_birth TEXT,
                gender TEXT, marital_status TEXT, blood_group TEXT,
                nationality TEXT DEFAULT 'Indian', religion TEXT,
                mobile TEXT NOT NULL, alternate_mobile TEXT,
                email TEXT, personal_email TEXT,
                temp_address TEXT, temp_city TEXT, temp_state TEXT, temp_pincode TEXT,
                perm_address TEXT, perm_city TEXT, perm_state TEXT, perm_pincode TEXT,
                aadhaar_number_encrypted TEXT, pan_number TEXT,
                passport_number TEXT, driving_license TEXT, voter_id TEXT,
                bank_name TEXT, bank_branch TEXT,
                bank_account_encrypted TEXT, bank_ifsc TEXT,
                designation TEXT, department TEXT,
                employment_type TEXT DEFAULT 'Full-time',
                date_of_joining TEXT NOT NULL,
                year_of_joining INTEGER,
                confirmation_date TEXT, date_of_leaving TEXT, leaving_reason TEXT,
                basic_salary REAL DEFAULT 0, home_allowance REAL DEFAULT 0,
                food_allowance REAL DEFAULT 0, transport_allowance REAL DEFAULT 0,
                medical_allowance REAL DEFAULT 0, special_allowance REAL DEFAULT 0,
                gross_salary REAL,
                emergency_contact_name TEXT, emergency_contact_relation TEXT,
                emergency_contact_phone TEXT,
                past_work_profiles TEXT,
                profile_photo TEXT,
                status TEXT DEFAULT 'Active',
                created_by INTEGER, updated_by INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (company_id) REFERENCES companies(id),
                FOREIGN KEY (created_by) REFERENCES users(id),
                FOREIGN KEY (updated_by) REFERENCES users(id)
            )
        `);
        console.log('  ✓ employees');
        
        await run(`
            CREATE TABLE employee_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER NOT NULL,
                document_type TEXT NOT NULL,
                document_name TEXT,
                original_filename TEXT,
                file_path TEXT NOT NULL,
                file_size INTEGER,
                mime_type TEXT,
                is_verified INTEGER DEFAULT 0,
                verified_by INTEGER,
                verified_at TEXT,
                remarks TEXT,
                uploaded_by INTEGER,
                uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(id),
                FOREIGN KEY (verified_by) REFERENCES users(id),
                FOREIGN KEY (uploaded_by) REFERENCES users(id)
            )
        `);
        console.log('  ✓ employee_documents');
        
        await run(`
            CREATE TABLE salary_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER NOT NULL,
                company_id INTEGER NOT NULL,
                month INTEGER NOT NULL, year INTEGER NOT NULL,
                basic_salary REAL DEFAULT 0, home_allowance REAL DEFAULT 0,
                food_allowance REAL DEFAULT 0, transport_allowance REAL DEFAULT 0,
                medical_allowance REAL DEFAULT 0, special_allowance REAL DEFAULT 0,
                overtime_pay REAL DEFAULT 0, bonus REAL DEFAULT 0,
                gross_earnings REAL DEFAULT 0,
                pf_deduction REAL DEFAULT 0, esi_deduction REAL DEFAULT 0,
                tax_deduction REAL DEFAULT 0, loan_deduction REAL DEFAULT 0,
                other_deductions REAL DEFAULT 0, total_deductions REAL DEFAULT 0,
                net_salary REAL DEFAULT 0,
                payment_status TEXT DEFAULT 'Pending',
                payment_date TEXT, payment_mode TEXT DEFAULT 'Bank Transfer',
                transaction_id TEXT, remarks TEXT,
                generated_by INTEGER,
                generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(id),
                FOREIGN KEY (company_id) REFERENCES companies(id),
                FOREIGN KEY (generated_by) REFERENCES users(id)
            )
        `);
        console.log('  ✓ salary_records');
        
        await run(`
            CREATE TABLE allowances (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL, code TEXT UNIQUE NOT NULL,
                description TEXT, type TEXT DEFAULT 'Fixed',
                default_amount REAL DEFAULT 0,
                percentage_of TEXT,
                is_taxable INTEGER DEFAULT 1,
                is_active INTEGER DEFAULT 1,
                company_id INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (company_id) REFERENCES companies(id)
            )
        `);
        console.log('  ✓ allowances');
        
        await run(`
            CREATE TABLE activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER, company_id INTEGER,
                action TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id INTEGER,
                description TEXT,
                old_values TEXT, new_values TEXT,
                ip_address TEXT, user_agent TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (company_id) REFERENCES companies(id)
            )
        `);
        console.log('  ✓ activity_logs');
        
        await run(`
            CREATE TABLE login_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER, email TEXT,
                status TEXT NOT NULL,
                ip_address TEXT, user_agent TEXT,
                failure_reason TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        console.log('  ✓ login_logs');
        
        await run(`
            CREATE TABLE sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL,
                ip_address TEXT, user_agent TEXT,
                expires_at TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        console.log('  ✓ sessions');
        
        await run(`
            CREATE TABLE employee_sequences (
                company_id INTEGER PRIMARY KEY,
                last_sequence INTEGER DEFAULT 0,
                prefix TEXT DEFAULT 'EMP',
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (company_id) REFERENCES companies(id)
            )
        `);
        console.log('  ✓ employee_sequences');
        
        // Copy data
        console.log('\n📦 Copying data from MySQL...\n');
        
        const tables = ['companies', 'users', 'employees', 'employee_documents', 
                       'salary_records', 'allowances', 'activity_logs', 'login_logs', 
                       'sessions', 'employee_sequences'];
        
        for (const table of tables) {
            const [rows] = await mysqlConn.query(`SELECT * FROM ${table}`);
            
            if (rows.length > 0) {
                const columns = Object.keys(rows[0]).join(', ');
                const placeholders = Object.keys(rows[0]).map(() => '?').join(', ');
                
                for (const row of rows) {
                    const values = Object.values(row);
                    await run(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, values);
                }
                console.log(`  ✓ ${table}: ${rows.length} rows`);
            } else {
                console.log(`  ✓ ${table}: 0 rows`);
            }
        }
        
        await mysqlConn.end();
        db.close();
        
        console.log(`\n✅ Migration completed successfully!`);
        console.log(`📁 Location: ${sqliteDbPath}\n`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

migrateMySQLToSQLite();
