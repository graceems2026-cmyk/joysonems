const pool = require('../config/database');

(async () => {
  try {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM employees');
    console.log('Total employees:', total);

    const [[{ totalCompanies }]] = await pool.query('SELECT COUNT(*) as total FROM companies');
    console.log('Total companies:', totalCompanies);

    const [companies] = await pool.query('SELECT id, name FROM companies');
    console.log('Companies:', companies);

    const [emps] = await pool.query('SELECT id, employee_id, first_name, company_id FROM employees ORDER BY id');
    console.log('Employees:', emps);

    const [rows] = await pool.query(`SELECT id, employee_id, first_name, last_name, company_id,
      aadhaar_attachment, driving_license_attachment, bank_passbook_attachment, created_at
      FROM employees
      ORDER BY created_at DESC
      LIMIT 200`);

    console.log('Sample employees (most recent first):');
    rows.forEach(r => {
      console.log({
        id: r.id,
        employee_id: r.employee_id,
        name: (r.first_name || '') + ' ' + (r.last_name || ''),
        company_id: r.company_id,
        aadhaar_attachment: r.aadhaar_attachment,
        driving_license_attachment: r.driving_license_attachment,
        bank_passbook_attachment: r.bank_passbook_attachment,
        created_at: r.created_at
      });
    });

    // List employees that have any of the three attachments
    const [withDocs] = await pool.query(`SELECT id, employee_id, first_name, last_name, aadhaar_attachment, driving_license_attachment, bank_passbook_attachment FROM employees WHERE aadhaar_attachment IS NOT NULL OR driving_license_attachment IS NOT NULL OR bank_passbook_attachment IS NOT NULL ORDER BY created_at DESC LIMIT 200`);
    console.log('\nEmployees with at least one attachment:', withDocs.length);
    withDocs.slice(0,50).forEach(r => console.log({id:r.id, employee_id:r.employee_id, aadhaar:r.aadhaar_attachment, driving:r.driving_license_attachment, bank:r.bank_passbook_attachment}));

    // Show distinct company_ids
    const [distinctCompanies] = await pool.query('SELECT DISTINCT company_id FROM employees');
    console.log('\nDistinct company_id values:', distinctCompanies.map(c=>c.company_id));

    process.exit(0);
  } catch (err) {
    console.error('Error querying DB:', err);
    process.exit(1);
  }
})();
