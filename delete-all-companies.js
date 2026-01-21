const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// SQLite database file path
const dbPath = path.join(__dirname, 'employees.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Database connected successfully');
        deleteAllCompanies();
    }
});

function deleteAllCompanies() {
    // First, get the count of companies to be deleted
    db.get('SELECT COUNT(*) as count FROM companies', (err, row) => {
        if (err) {
            console.error('❌ Error counting companies:', err.message);
            db.close();
            process.exit(1);
        }

        const count = row.count;
        console.log(`📊 Found ${count} companies to delete`);

        // Delete all companies
        db.run('DELETE FROM companies', function(err) {
            if (err) {
                console.error('❌ Error deleting companies:', err.message);
                db.close();
                process.exit(1);
            }

            console.log(`✅ Successfully deleted ${this.changes} companies from the database`);
            
            // Verify deletion
            db.get('SELECT COUNT(*) as count FROM companies', (err, row) => {
                if (err) {
                    console.error('❌ Error verifying deletion:', err.message);
                } else {
                    console.log(`✓ Remaining companies: ${row.count}`);
                }
                
                db.close();
                process.exit(0);
            });
        });
    });
}
