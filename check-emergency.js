const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('employees.db');

db.all('SELECT id, first_name, last_name, emergency_contact_name, emergency_contact_phone, emergency_contact_relation FROM employees WHERE first_name LIKE "%SANJAYA%"', (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Emergency contact data:');
        console.log(JSON.stringify(rows, null, 2));
    }
    db.close();
});
