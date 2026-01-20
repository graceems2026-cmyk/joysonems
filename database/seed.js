require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_encryption_key_32_chars!';

function encrypt(text) {
    if (!text) return null;
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

async function seedDatabase() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'employee_management'
        });

        console.log('📡 Connected to database');

        // Check if data already exists
        const [existingUsers] = await connection.query('SELECT COUNT(*) as count FROM users');
        if (existingUsers[0].count > 0) {
            console.log('⚠️ Database already has data. Skipping seed.');
            return;
        }

        // Create companies
        console.log('🏢 Creating companies...');
        const companies = [
            {
                name: 'Joyson Technologies Pvt Ltd',
                code: 'JOYTECH',
                address: '123 Tech Park, Electronic City',
                city: 'Bangalore',
                state: 'Karnataka',
                pincode: '560100',
                gst_number: '29AABCJ1234F1ZP',
                pan_number: 'AABCJ1234F',
                phone: '+91 80 4567 8900',
                email: 'info@joysontech.com',
                website: 'https://joysontech.com'
            },
            {
                name: 'Joyson Manufacturing Ltd',
                code: 'JOYMFG',
                address: '456 Industrial Area, Phase 2',
                city: 'Chennai',
                state: 'Tamil Nadu',
                pincode: '600032',
                gst_number: '33AABCJ5678G1ZQ',
                pan_number: 'AABCJ5678G',
                phone: '+91 44 2345 6789',
                email: 'info@joysonmfg.com',
                website: 'https://joysonmfg.com'
            },
            {
                name: 'Joyson Services Corp',
                code: 'JOYSVC',
                address: '789 Business Hub, Cyber City',
                city: 'Hyderabad',
                state: 'Telangana',
                pincode: '500081',
                gst_number: '36AABCJ9012H1ZR',
                pan_number: 'AABCJ9012H',
                phone: '+91 40 6789 0123',
                email: 'info@joysonsvc.com',
                website: 'https://joysonsvc.com'
            }
        ];

        for (const company of companies) {
            await connection.query(
                `INSERT INTO companies (name, code, address, city, state, pincode, 
                    gst_number, pan_number, phone, email, website) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [company.name, company.code, company.address, company.city, company.state,
                 company.pincode, company.gst_number, company.pan_number, company.phone,
                 company.email, company.website]
            );
        }

        // Get company IDs
        const [companyRows] = await connection.query('SELECT id, code FROM companies');
        const companyMap = {};
        companyRows.forEach(row => companyMap[row.code] = row.id);

        // Create users
        console.log('👤 Creating users...');
        const hashedPassword = await bcrypt.hash('Admin@123', 12);

        const users = [
            {
                email: 'superadmin@joyson.com',
                password_hash: hashedPassword,
                first_name: 'Super',
                last_name: 'Admin',
                phone: '+91 9876543210',
                role: 'SUPER_ADMIN',
                company_id: null
            },
            {
                email: 'admin@joysontech.com',
                password_hash: hashedPassword,
                first_name: 'Tech',
                last_name: 'Admin',
                phone: '+91 9876543211',
                role: 'COMPANY_ADMIN',
                company_id: companyMap['JOYTECH']
            },
            {
                email: 'admin@joysonmfg.com',
                password_hash: hashedPassword,
                first_name: 'Manufacturing',
                last_name: 'Admin',
                phone: '+91 9876543212',
                role: 'COMPANY_ADMIN',
                company_id: companyMap['JOYMFG']
            },
            {
                email: 'admin@joysonsvc.com',
                password_hash: hashedPassword,
                first_name: 'Service',
                last_name: 'Admin',
                phone: '+91 9876543213',
                role: 'COMPANY_ADMIN',
                company_id: companyMap['JOYSVC']
            }
        ];

        for (const user of users) {
            await connection.query(
                `INSERT INTO users (email, password_hash, first_name, last_name, phone, role, company_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [user.email, user.password_hash, user.first_name, user.last_name,
                 user.phone, user.role, user.company_id]
            );
        }

        // Create employee sequences for each company
        console.log('🔢 Creating employee sequences...');
        for (const code in companyMap) {
            await connection.query(
                `INSERT INTO employee_sequences (company_id, last_sequence, prefix)
                 VALUES (?, 0, ?)`,
                [companyMap[code], code.substring(0, 3)]
            );
        }

        // Create sample employees
        console.log('👥 Creating sample employees...');
        const departments = ['Engineering', 'Human Resources', 'Finance', 'Marketing', 'Operations'];
        const designations = ['Software Engineer', 'Senior Developer', 'Team Lead', 'Manager', 'Analyst'];
        const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

        let employeeCount = 0;
        for (const code in companyMap) {
            const companyId = companyMap[code];
            const prefix = code.substring(0, 3);
            
            for (let i = 1; i <= 10; i++) {
                const sequence = i.toString().padStart(4, '0');
                const employeeId = `${prefix}-2024-${sequence}`;
                // Check if employee_id already exists
                const [empExists] = await connection.query('SELECT 1 FROM employees WHERE employee_id = ?', [employeeId]);
                if (empExists.length > 0) {
                    // Skip if already exists
                    continue;
                }
                const dept = departments[Math.floor(Math.random() * departments.length)];
                const desig = designations[Math.floor(Math.random() * designations.length)];
                const blood = bloodGroups[Math.floor(Math.random() * bloodGroups.length)];

                const baseSalary = 30000 + Math.floor(Math.random() * 70000);
                const homeAllowance = Math.floor(baseSalary * 0.1);
                const foodAllowance = 3000 + Math.floor(Math.random() * 2000);

                await connection.query(
                    `INSERT INTO employees (
                        employee_id, company_id, first_name, last_name, father_or_guardian,
                        date_of_birth, gender, marital_status, blood_group,
                        mobile, email, temp_address, temp_city, temp_state, temp_pincode,
                        perm_address, perm_city, perm_state, perm_pincode,
                        aadhaar_number_encrypted, bank_name, bank_account_encrypted, bank_ifsc,
                        designation, department, date_of_joining,
                        basic_salary, home_allowance, food_allowance,
                        emergency_contact_name, emergency_contact_relation, emergency_contact_phone,
                        status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        employeeId, companyId,
                        `Employee${employeeCount + 1}`, `LastName${employeeCount + 1}`,
                        `Father of Employee${employeeCount + 1}`,
                        new Date(1985 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                        i % 3 === 0 ? 'Female' : 'Male',
                        i % 2 === 0 ? 'Married' : 'Single',
                        blood,
                        `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
                        `employee${employeeCount + 1}@${code.toLowerCase()}.com`,
                        `Temp Address ${i}`, 'Bangalore', 'Karnataka', '560001',
                        `Perm Address ${i}`, 'Chennai', 'Tamil Nadu', '600001',
                        encrypt(`${Math.floor(100000000000 + Math.random() * 900000000000)}`),
                        'HDFC Bank',
                        encrypt(`${Math.floor(10000000000 + Math.random() * 90000000000)}`),
                        'HDFC0001234',
                        desig, dept,
                        new Date(2020 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                        baseSalary, homeAllowance, foodAllowance,
                        `Emergency Contact ${i}`, i % 2 === 0 ? 'Spouse' : 'Parent',
                        `+91 97${Math.floor(10000000 + Math.random() * 90000000)}`,
                        'Active'
                    ]
                );

                employeeCount++;

                // Update sequence
                await connection.query(
                    'UPDATE employee_sequences SET last_sequence = ? WHERE company_id = ?',
                    [i, companyId]
                );
            }
        }

        // Create sample allowances
        console.log('💰 Creating allowances...');
        const allowances = [
            { name: 'House Rent Allowance', code: 'HRA', type: 'Percentage', percentage_of: 'basic_salary', default_amount: 40 },
            { name: 'Dearness Allowance', code: 'DA', type: 'Percentage', percentage_of: 'basic_salary', default_amount: 10 },
            { name: 'Food Allowance', code: 'FA', type: 'Fixed', default_amount: 3000 },
            { name: 'Transport Allowance', code: 'TA', type: 'Fixed', default_amount: 2000 },
            { name: 'Medical Allowance', code: 'MA', type: 'Fixed', default_amount: 1500 }
        ];

        for (const allowance of allowances) {
            await connection.query(
                `INSERT INTO allowances (name, code, type, percentage_of, default_amount, is_taxable)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [allowance.name, allowance.code, allowance.type, allowance.percentage_of || null,
                 allowance.default_amount, true]
            );
        }

        console.log('✅ Database seeded successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Super Admin: superadmin@joyson.com / Admin@123');
        console.log('Tech Admin:  admin@joysontech.com / Admin@123');
        console.log('Mfg Admin:   admin@joysonmfg.com / Admin@123');
        console.log('Svc Admin:   admin@joysonsvc.com / Admin@123');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

seedDatabase();
