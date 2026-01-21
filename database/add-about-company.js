const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'employees.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
});

// Add about column to companies table
db.run(`
    ALTER TABLE companies ADD COLUMN about TEXT DEFAULT NULL
`, (err) => {
    if (err) {
        if (err.message.includes('duplicate column')) {
            console.log('✓ Column "about" already exists in companies table');
        } else {
            console.error('Error adding column:', err);
        }
    } else {
        console.log('✓ Successfully added "about" column to companies table');
    }
    db.close();
});
