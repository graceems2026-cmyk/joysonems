const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('employees.db');

// Update employee ID 6 with emergency contact phone
db.run(`UPDATE employees 
        SET emergency_contact_phone = '8946098018' 
        WHERE id = 6`, 
    (err) => {
        if (err) {
            console.error('Error:', err);
        } else {
            console.log('Successfully added emergency contact phone to employee ID 6');
        }
        db.close();
    }
);
