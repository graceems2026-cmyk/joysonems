const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'employees.db');
const db = new sqlite3.Database(dbPath);

// Check companies
db.all('SELECT * FROM companies', [], (err, companies) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log('\n=== COMPANIES ===');
    companies.forEach(c => {
        console.log(`ID: ${c.id}, Name: ${c.name}, Code: ${c.code}, Active: ${c.is_active}`);
    });
});

// Check users
db.all('SELECT id, username, role, company_id FROM users', [], (err, users) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log('\n=== USERS ===');
    users.forEach(u => {
        console.log(`ID: ${u.id}, Username: ${u.username}, Role: ${u.role}, Company: ${u.company_id}`);
    });
    
    db.close();
});
