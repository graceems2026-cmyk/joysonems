const pool = require('../config/database');

(async () => {
  try {
    const [users] = await pool.query('SELECT id, email, first_name, role, company_id FROM users ORDER BY id');
    console.log('Users:');
    users.forEach(u => console.log(u));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
