const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const idArg = process.argv[2];
if (!idArg) {
    console.error('Usage: node delete-user.js <id>');
    process.exit(1);
}
const userId = Number(idArg);
if (isNaN(userId)) {
    console.error('Invalid id:', idArg);
    process.exit(1);
}

const dbPath = path.join(__dirname, 'employees.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    }
    console.log('✅ Database connected');
    previewAndDelete(userId);
});

function previewAndDelete(id) {
    db.get('SELECT id, email, first_name, last_name, role, company_id FROM users WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('❌ Error querying user:', err.message);
            db.close();
            process.exit(1);
        }
        if (!row) {
            console.log('ℹ️ No user found with id', id);
            db.close();
            process.exit(0);
        }

        console.log('Found user:');
        console.table([row]);

        // Proceed to delete
        db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
            if (err) {
                console.error('❌ Error deleting user:', err.message);
                db.close();
                process.exit(1);
            }
            console.log(`✅ Deleted ${this.changes} row(s)`);

            // Verify
            db.get('SELECT id FROM users WHERE id = ?', [id], (err, verify) => {
                if (err) console.error('❌ Error verifying deletion:', err.message);
                else if (!verify) console.log('✓ Verification: user no longer exists');
                else console.log('⚠️ Verification: user still exists', verify);
                db.close();
            });
        });
    });
}
