import { pool } from '../src/config/db';

async function run() {
  try {
    const res = await pool.query("SELECT * FROM employees WHERE division = 'SERVICE' ORDER BY created_at DESC LIMIT 5");
    console.log('Employees in SERVICE:', res.rows.map(r => ({ id: r.id, name: r.name, created_at: r.created_at })));
  } catch (err: any) {
    console.log('Error:', err.message);
  } finally {
    process.exit();
  }
}

run();
