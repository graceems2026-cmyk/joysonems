const pool = require('../config/database');

async function addEmployeeColumns() {
    try {
        console.log('Adding new employee columns...');
        
        const columns = [
            "ADD COLUMN father_name VARCHAR(100)",
            "ADD COLUMN guardian_name VARCHAR(100)",
            "ADD COLUMN marital_status ENUM('Single', 'Married', 'Divorced', 'Widowed') DEFAULT 'Single'",
            "ADD COLUMN temporary_address TEXT",
            "ADD COLUMN permanent_address TEXT",
            "ADD COLUMN home_allowance DECIMAL(10,2) DEFAULT 0",
            "ADD COLUMN food_allowance DECIMAL(10,2) DEFAULT 0",
            "ADD COLUMN emergency_contact VARCHAR(15)",
            "ADD COLUMN emergency_contact_name VARCHAR(100)",
            "ADD COLUMN emergency_contact_relation VARCHAR(50)",
            "ADD COLUMN past_experience TEXT",
            "ADD COLUMN education_qualification VARCHAR(200)",
            "ADD COLUMN driving_license_no VARCHAR(50)",
            "ADD COLUMN year_of_joining INT",
            "ADD COLUMN aadhaar_photo VARCHAR(255)",
            "ADD COLUMN bank_document VARCHAR(255)",
            "ADD COLUMN education_document VARCHAR(255)",
            "ADD COLUMN license_document VARCHAR(255)"
        ];

        for (const column of columns) {
            try {
                await pool.query(`ALTER TABLE employees ${column}`);
                console.log(`✓ Added: ${column}`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`- Already exists: ${column}`);
                } else {
                    console.log(`⚠ Warning: ${column} - ${err.message}`);
                }
            }
        }

        // Update year_of_joining for existing employees
        await pool.query(`
            UPDATE employees 
            SET year_of_joining = YEAR(date_of_joining) 
            WHERE year_of_joining IS NULL AND date_of_joining IS NOT NULL
        `);

        console.log('\n✅ Employee table updated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addEmployeeColumns();
