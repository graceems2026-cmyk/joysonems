const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'employees.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding password_encrypted column to users table...');

db.serialize(() => {
    // Add password_encrypted column
    db.run(`
        ALTER TABLE users ADD COLUMN password_encrypted TEXT;
    `, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✓ Column password_encrypted already exists');
            } else {
                console.error('Error adding password_encrypted column:', err);
            }
        } else {
            console.log('✓ Added password_encrypted column');
        }
    });
    
    // Verify the column was added
    db.all("PRAGMA table_info(users)", (err, rows) => {
        if (err) {
            console.error('Error checking table info:', err);
        } else {
            console.log('\nUsers table columns:');
            rows.forEach(row => {
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
