const pool = require('../config/database');

(async () => {
  try {
    // Run the same SELECT used in employees.js filtered by company_id = 9
    const companyId = 9;
    const sql = `SELECT e.id, e.employee_id, e.first_name, e.last_name, c.id as company_id, c.name as company_name
                 FROM employees e
                 JOIN companies c ON e.company_id = c.id
                 WHERE e.company_id = ?
                 ORDER BY e.created_at DESC`;
    const [rows] = await pool.query(sql, [companyId]);
    console.log(`Employees for company_id=${companyId}:`, rows.length);
    rows.forEach(r => console.log(r));

    // Check employee_documents for employee 9 and 8
    for (const id of [9,8]) {
      const [docs] = await pool.query('SELECT * FROM employee_documents WHERE employee_id = ? ORDER BY uploaded_at DESC', [id]);
      console.log(`\nDocuments for employee ${id}: count=${docs.length}`);
      docs.forEach(d => console.log({id: d.id, document_type: d.document_type, file_path: d.file_path, original_filename: d.original_filename, uploaded_at: d.uploaded_at}));
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
