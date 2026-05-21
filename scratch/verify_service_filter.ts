import { pool } from '../src/config/db';

async function run() {
  try {
    const res = await pool.query("SELECT * FROM employees WHERE UPPER(division) = 'SERVICE'");
    console.log('Employees in SERVICE:', res.rows.map(r => r.name));
  } catch (err: any) {
    console.log('Error:', err.message);
  } finally {
    process.exit();
  }
}

run();
