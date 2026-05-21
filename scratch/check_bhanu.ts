import { pool } from '../src/config/db';

async function run() {
  try {
    const res = await pool.query("SELECT id, name, division FROM users WHERE name ILIKE 'Bhanu%'");
    console.log('Bhanu info:', res.rows);
  } catch (err: any) {
    console.log('Error:', err.message);
  } finally {
    process.exit();
  }
}

run();
