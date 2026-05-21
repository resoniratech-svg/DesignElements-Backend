const { pool } = require('./dist/config/db');
const fs = require('fs');

async function test() {
  const result = {};
  
  try {
    await pool.query(`SELECT id, client_id, client_name, project_name, contract_value, start_date, end_date, manager, description, division, status, created_at FROM projects ORDER BY created_at DESC LIMIT 1 OFFSET 0`);
    result.projects = "ok";
  } catch(e) {
    result.projects = e.message;
  }

  try {
    const res = await pool.query(`SELECT * FROM users WHERE role='CLIENT' LIMIT 1`);
    result.users = res.rows.length;
  } catch(e) {
    result.users = e.message;
  }

  try {
    const res = await pool.query(`SELECT * FROM invoices LIMIT 1`);
    result.invoices = res.rows.length;
  } catch(e) {
    result.invoices = e.message;
  }
  
  fs.writeFileSync('test-db-output.json', JSON.stringify(result, null, 2));
}
test().then(() => process.exit(0));
