import { pool } from '../src/config/db';

async function run() {
  try {
    await pool.query('ALTER TABLE employees ADD COLUMN company VARCHAR(255)');
    console.log('Column company added successfully');
  } catch (err: any) {
    if (err.message.includes('already exists')) {
        console.log('Column already exists');
    } else {
        console.log('Error:', err.message);
    }
  } finally {
    process.exit();
  }
}

run();
