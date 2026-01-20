/**
 * Database Migration Script - Add New Employee Fields
 * This script adds all the new fields to the employees table
 */

const pool = require('../config/database');

async function migrateNewFields() {
    console.log('Starting database migration for new employee fields...');
    
    try {
        // Add new fields to employees table
        const alterStatements = [
            // Family information
            `ALTER TABLE employees ADD COLUMN mother_name VARCHAR(255)`,
            `ALTER TABLE employees ADD COLUMN spouse_name VARCHAR(255)`,
            `ALTER TABLE employees ADD COLUMN number_of_children INT DEFAULT 0`,
            `ALTER TABLE employees ADD COLUMN children_names JSON`,
            
            // Medical details
            `ALTER TABLE employees ADD COLUMN medical_details TEXT`,
            
            // Document attachments
            `ALTER TABLE employees ADD COLUMN aadhaar_attachment VARCHAR(500)`,
            `ALTER TABLE employees ADD COLUMN driving_license_attachment VARCHAR(500)`,
            `ALTER TABLE employees ADD COLUMN education_attachment VARCHAR(500)`,
            `ALTER TABLE employees ADD COLUMN bank_passbook_attachment VARCHAR(500)`,
            
            // Bank details
            `ALTER TABLE employees ADD COLUMN account_holder_name VARCHAR(255)`,
            
            // Employment
            `ALTER TABLE employees ADD COLUMN education_qualification TEXT`,
            
            // Termination details
            `ALTER TABLE employees ADD COLUMN last_day_of_work DATE`,
            `ALTER TABLE employees ADD COLUMN final_payment DECIMAL(12, 2)`,
            `ALTER TABLE employees ADD COLUMN leaving_other_details TEXT`,
            `ALTER TABLE employees ADD COLUMN leaving_attachment VARCHAR(500)`,
            
            // Reporting person
            `ALTER TABLE employees ADD COLUMN reporting_person_name VARCHAR(255)`,
            `ALTER TABLE employees ADD COLUMN reporting_person_role VARCHAR(100)`,
            
            // Training, performance, leave, and salary increment records
            `ALTER TABLE employees ADD COLUMN training_records JSON`,
            `ALTER TABLE employees ADD COLUMN performance_records JSON`,
            `ALTER TABLE employees ADD COLUMN leave_records JSON`,
            `ALTER TABLE employees ADD COLUMN salary_increment_records JSON`
        ];

        for (const statement of alterStatements) {
            try {
                await pool.query(statement);
                console.log(`✓ Executed: ${statement.substring(0, 60)}...`);
            } catch (error) {
                // Column might already exist, skip if duplicate column error
                if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('duplicate column')) {
                    console.log(`⚠ Skipped (already exists): ${statement.substring(0, 60)}...`);
                } else {
                    throw error;
                }
            }
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('\nNew fields added:');
        console.log('  - Family: mother_name, spouse_name, number_of_children, children_names');
        console.log('  - Medical: medical_details');
        console.log('  - Attachments: aadhaar_attachment, driving_license_attachment, education_attachment, bank_passbook_attachment');
        console.log('  - Bank: account_holder_name');
        console.log('  - Employment: education_qualification');
        console.log('  - Termination: last_day_of_work, final_payment, leaving_other_details, leaving_attachment');
        console.log('  - Reporting: reporting_person_name, reporting_person_role');
        console.log('  - Records: training_records, performance_records, leave_records, salary_increment_records');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateNewFields();
