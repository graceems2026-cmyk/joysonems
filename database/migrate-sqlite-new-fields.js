/**
 * SQLite Migration Script - Add New Employee Fields
 * Run this with: node database/migrate-sqlite-new-fields.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'employees.db');

async function migrate() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Database connection failed:', err);
                reject(err);
                return;
            }
            console.log('✅ Connected to SQLite database');
        });

        db.serialize(() => {
            console.log('\n🔄 Starting migration for new employee fields...\n');

            const alterStatements = [
                // Family information
                { sql: `ALTER TABLE employees ADD COLUMN mother_name TEXT`, desc: 'Mother name' },
                { sql: `ALTER TABLE employees ADD COLUMN spouse_name TEXT`, desc: 'Spouse name' },
                { sql: `ALTER TABLE employees ADD COLUMN number_of_children INTEGER DEFAULT 0`, desc: 'Number of children' },
                { sql: `ALTER TABLE employees ADD COLUMN children_names TEXT`, desc: 'Children names (JSON)' },
                
                // Medical details
                { sql: `ALTER TABLE employees ADD COLUMN medical_details TEXT`, desc: 'Medical details' },
                
                // Document attachments
                { sql: `ALTER TABLE employees ADD COLUMN aadhaar_attachment TEXT`, desc: 'Aadhaar attachment' },
                { sql: `ALTER TABLE employees ADD COLUMN driving_license_attachment TEXT`, desc: 'Driving license attachment' },
                { sql: `ALTER TABLE employees ADD COLUMN education_attachment TEXT`, desc: 'Education attachment' },
                { sql: `ALTER TABLE employees ADD COLUMN bank_passbook_attachment TEXT`, desc: 'Bank passbook attachment' },
                
                // Bank details
                { sql: `ALTER TABLE employees ADD COLUMN account_holder_name TEXT`, desc: 'Account holder name' },
                
                // Employment
                { sql: `ALTER TABLE employees ADD COLUMN education_qualification TEXT`, desc: 'Education qualification' },
                
                // Termination details
                { sql: `ALTER TABLE employees ADD COLUMN last_day_of_work TEXT`, desc: 'Last day of work' },
                { sql: `ALTER TABLE employees ADD COLUMN final_payment REAL`, desc: 'Final payment' },
                { sql: `ALTER TABLE employees ADD COLUMN leaving_other_details TEXT`, desc: 'Leaving other details' },
                { sql: `ALTER TABLE employees ADD COLUMN leaving_attachment TEXT`, desc: 'Leaving attachment' },
                
                // Reporting person
                { sql: `ALTER TABLE employees ADD COLUMN reporting_person_name TEXT`, desc: 'Reporting person name' },
                { sql: `ALTER TABLE employees ADD COLUMN reporting_person_role TEXT`, desc: 'Reporting person role' },
                
                // Training, performance, and leave records (stored as JSON text)
                { sql: `ALTER TABLE employees ADD COLUMN training_records TEXT`, desc: 'Training records (JSON)' },
                { sql: `ALTER TABLE employees ADD COLUMN performance_records TEXT`, desc: 'Performance records (JSON)' },
                { sql: `ALTER TABLE employees ADD COLUMN leave_records TEXT`, desc: 'Leave records (JSON)' }
            ];

            let completed = 0;
            let skipped = 0;
            let errors = 0;

            alterStatements.forEach((stmt, index) => {
                db.run(stmt.sql, (err) => {
                    if (err) {
                        if (err.message.includes('duplicate column')) {
                            console.log(`⚠️  Skipped: ${stmt.desc} (already exists)`);
                            skipped++;
                        } else {
                            console.error(`❌ Error adding ${stmt.desc}:`, err.message);
                            errors++;
                        }
                    } else {
                        console.log(`✅ Added: ${stmt.desc}`);
                        completed++;
                    }

                    // When all statements are processed
                    if (index === alterStatements.length - 1) {
                        setTimeout(() => {
                            console.log('\n' + '='.repeat(60));
                            console.log('📊 Migration Summary:');
                            console.log(`   ✅ Successfully added: ${completed} fields`);
                            console.log(`   ⚠️  Skipped (existing): ${skipped} fields`);
                            console.log(`   ❌ Errors: ${errors} fields`);
                            console.log('='.repeat(60) + '\n');

                            if (errors === 0) {
                                console.log('✅ Migration completed successfully!\n');
                                console.log('New employee fields available:');
                                console.log('  📋 Family: mother_name, spouse_name, number_of_children, children_names');
                                console.log('  🏥 Medical: medical_details');
                                console.log('  📎 Attachments: aadhaar, driving license, education, bank passbook');
                                console.log('  🏦 Bank: account_holder_name');
                                console.log('  💼 Employment: education_qualification');
                                console.log('  🚪 Termination: last_day_of_work, final_payment, leaving details');
                                console.log('  👔 Reporting: reporting_person_name, reporting_person_role');
                                console.log('  📊 Records: training, performance, leave (JSON format)');
                            } else {
                                console.log('⚠️  Migration completed with some errors. Please check above.\n');
                            }

                            db.close((err) => {
                                if (err) console.error('Error closing database:', err);
                                else console.log('Database connection closed.\n');
                                process.exit(errors === 0 ? 0 : 1);
                            });
                        }, 100);
                    }
                });
            });
        });
    });
}

// Run migration
console.log('🚀 SQLite Employee Database Migration');
console.log('=' .repeat(60));
migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
