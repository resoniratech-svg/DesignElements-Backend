import { pool } from '../src/config/db';

async function run() {
  try {
    const e = await pool.query('SELECT id, name, division, status FROM employees');
    console.log('employees table:', e.rows);
    
    const u = await pool.query("SELECT id, name, division, status, role FROM users WHERE name ILIKE '%thirumala%'");
    console.log('thirumala in users:', u.rows);
  } catch (err: any) {
    console.log('Error:', err.message);
  } finally {
    process.exit();
  }
}

run();
