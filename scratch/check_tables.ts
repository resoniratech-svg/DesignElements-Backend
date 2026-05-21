import { pool } from '../src/config/db';

async function run() {
  try {
    const e1 = await pool.query('SELECT name FROM employees');
    console.log('employees table:', e1.rows.map(r => r.name));
    
    const e2 = await pool.query('SELECT name FROM "Employee"');
    console.log('"Employee" table:', e2.rows.map(r => r.name));

    const u = await pool.query("SELECT name FROM users WHERE role != 'SUPER_ADMIN'");
    console.log('users table:', u.rows.map(r => r.name));
  } catch (err: any) {
    console.log('Error:', err.message);
  } finally {
    process.exit();
  }
}

run();
