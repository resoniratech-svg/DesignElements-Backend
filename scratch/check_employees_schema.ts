import { pool } from '../src/config/db';

async function run() {
  try {
    const res = await pool.query("SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'employees'");
    console.log(res.rows);
  } catch (err: any) {
    console.log('Error:', err.message);
  } finally {
    process.exit();
  }
}

run();
