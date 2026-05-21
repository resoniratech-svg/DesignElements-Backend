import { pool } from '../src/config/db';

async function run() {
  try {
    const res = await pool.query("SELECT column_name, column_default FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'id'");
    console.log(res.rows);
  } catch (err: any) {
    console.log('Error:', err.message);
  } finally {
    process.exit();
  }
}

run();
