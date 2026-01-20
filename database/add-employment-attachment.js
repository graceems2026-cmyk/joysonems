const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'employees.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding employment_attachment column to employees table...');

db.serialize(() => {
    // Add employment_attachment column
    db.run(`
        ALTER TABLE employees ADD COLUMN employment_attachment TEXT;
    `, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✓ Column employment_attachment already exists');
            } else {
                console.error('Error adding employment_attachment column:', err);
            }
        } else {
            console.log('✓ Added employment_attachment column');
        }
    });
    
    // Verify the column was added
    db.all("PRAGMA table_info(employees)", (err, rows) => {
        if (err) {
            console.error('Error checking table info:', err);
        } else {
            console.log('\nEmployees table - attachment columns:');
            rows.filter(row => row.name.includes('attachment')).forEach(row => {
                console.log(`  - ${row.name} (${row.type})`);
            });
        }
        
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('\n✓ Migration completed successfully');
            }
        });
    });
});
