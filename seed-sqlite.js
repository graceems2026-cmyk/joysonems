// Seed SQLite database with sample data
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'employees.db');
const db = new sqlite3.Database(dbPath);

console.log('🌱 Seeding database...\n');

const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
    });
});

async function seed() {
    try {
        // Check if data exists
        const count = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
        
        if (count > 0) {
            console.log('⚠️ Database already has data. Skipping seed.');
            db.close();
            return;
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash('Admin@123', 12);
        
        // Insert companies
        console.log('🏢 Creating companies...');
        await run(`INSERT INTO companies (name, code, address, city, state, pincode, gst_number, pan_number, phone, email, website, employee_count) 
                  VALUES ('Joyson Technologies Pvt Ltd', 'JOYTECH', '123 Tech Park, Electronic City', 'Bangalore', 'Karnataka', '560100', '29AABCJ1234F1ZP', 'AABCJ1234F', '+91 80 4567 8900', 'info@joysontech.com', 'https://joysontech.com', 0)`);
        
        await run(`INSERT INTO companies (name, code, address, city, state, pincode, gst_number, pan_number, phone, email, website, employee_count) 
                  VALUES ('Joyson Manufacturing Ltd', 'JOYMFG', '456 Industrial Area, Phase 2', 'Chennai', 'Tamil Nadu', '600032', '33AABCJ5678G1ZQ', 'AABCJ5678G', '+91 44 2345 6789', 'info@joysonmfg.com', 'https://joysonmfg.com', 0)`);
        
        await run(`INSERT INTO companies (name, code, address, city, state, pincode, gst_number, pan_number, phone, email, website, employee_count) 
                  VALUES ('Joyson Services Corp', 'JOYSVC', '789 Business Hub, Cyber City', 'Hyderabad', 'Telangana', '500081', '36AABCJ9012H1ZR', 'AABCJ9012H', '+91 40 6789 0123', 'info@joysonsvc.com', 'https://joysonsvc.com', 0)`);
        
        await run(`INSERT INTO companies (name, code, address, city, state, pincode, gst_number, pan_number, phone, email, website, employee_count) 
                  VALUES ('Zeony Technologies', 'ZEONY', '100 Innovation Drive', 'Mumbai', 'Maharashtra', '400001', '27AABCZ1234J1ZS', 'AABCZ1234J', '+91 22 1234 5678', 'info@zeony.com', 'https://zeony.com', 0)`);
        
        console.log('  ✓ 4 companies created');
        
        // Insert users
        console.log('\n👤 Creating users...');
        await run(`INSERT INTO users (email, password_hash, first_name, last_name, role, company_id, is_active) 
                  VALUES ('superadmin@joyson.com', ?, 'Super', 'Admin', 'SUPER_ADMIN', NULL, 1)`, [hashedPassword]);
        
        await run(`INSERT INTO users (email, password_hash, first_name, last_name, role, company_id, is_active) 
                  VALUES ('admin@joysontech.com', ?, 'Tech', 'Admin', 'COMPANY_ADMIN', 1, 1)`, [hashedPassword]);
        
        await run(`INSERT INTO users (email, password_hash, first_name, last_name, role, company_id, is_active) 
                  VALUES ('admin@joysonmfg.com', ?, 'Mfg', 'Admin', 'COMPANY_ADMIN', 2, 1)`, [hashedPassword]);
        
        await run(`INSERT INTO users (email, password_hash, first_name, last_name, role, company_id, is_active) 
                  VALUES ('admin@zeony.com', ?, 'Zeony', 'Admin', 'COMPANY_ADMIN', 4, 1)`, [hashedPassword]);
        
        console.log('  ✓ 4 users created (password: Admin@123)');
        
        // Insert sample employees
        console.log('\n👥 Creating sample employees...');
        await run(`INSERT INTO employees (employee_id, company_id, first_name, last_name, mobile, email, designation, department, date_of_joining, status, basic_salary, gross_salary, created_by) 
                  VALUES ('JOYTECH-2024-0001', 1, 'John', 'Doe', '9876543210', 'john.doe@joysontech.com', 'Software Engineer', 'IT', '2024-01-15', 'Active', 50000, 50000, 1)`);
        
        await run(`INSERT INTO employees (employee_id, company_id, first_name, last_name, mobile, email, designation, department, date_of_joining, status, basic_salary, gross_salary, created_by) 
                  VALUES ('JOYTECH-2024-0002', 1, 'Jane', 'Smith', '9876543211', 'jane.smith@joysontech.com', 'Senior Developer', 'IT', '2024-02-01', 'Active', 75000, 75000, 1)`);
        
        await run(`INSERT INTO employees (employee_id, company_id, first_name, last_name, mobile, email, designation, department, date_of_joining, status, basic_salary, gross_salary, created_by) 
                  VALUES ('JOYMFG-2024-0001', 2, 'Mike', 'Johnson', '9876543212', 'mike.johnson@joysonmfg.com', 'Production Manager', 'Manufacturing', '2024-01-20', 'Active', 60000, 60000, 1)`);
        
        await run(`INSERT INTO employees (employee_id, company_id, first_name, last_name, mobile, email, designation, department, date_of_joining, status, basic_salary, gross_salary, created_by) 
                  VALUES ('ZEONY-2024-0001', 4, 'Sarah', 'Williams', '9876543213', 'sarah.williams@zeony.com', 'Tech Lead', 'Development', '2024-03-01', 'Active', 80000, 80000, 1)`);
        
        console.log('  ✓ 4 employees created');
        
        // Insert employee sequences
        console.log('\n🔢 Creating employee sequences...');
        await run(`INSERT INTO employee_sequences (company_id, last_sequence, prefix) VALUES (1, 2, 'JOYTECH')`);
        await run(`INSERT INTO employee_sequences (company_id, last_sequence, prefix) VALUES (2, 1, 'JOYMFG')`);
        await run(`INSERT INTO employee_sequences (company_id, last_sequence, prefix) VALUES (3, 0, 'JOYSVC')`);
        await run(`INSERT INTO employee_sequences (company_id, last_sequence, prefix) VALUES (4, 1, 'ZEONY')`);
        console.log('  ✓ 4 sequences created');
        
        console.log('\n✅ Database seeded successfully!\n');
        console.log('🔐 Login credentials:');
        console.log('   Email: superadmin@joyson.com');
        console.log('   Password: Admin@123\n');
        
        db.close();
        
    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        db.close();
        process.exit(1);
    }
}

seed();
