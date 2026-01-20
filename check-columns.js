const pool = require('./config/database');

async function checkColumns() {
    try {
        const [rows] = await pool.query('DESCRIBE employees');
        console.log('\n=== EMPLOYEES TABLE COLUMNS ===');
        console.log('Total columns:', rows.length);
        console.log('\nColumn list:');
        rows.forEach((r, i) => {
            console.log(`${(i+1).toString().padStart(2, '0')}. ${r.Field.padEnd(30)} ${r.Type}`);
        });
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkColumns();
