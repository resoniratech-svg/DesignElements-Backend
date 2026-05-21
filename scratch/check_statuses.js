const { pool } = require('../src/config/db');

async function check() {
  try {
    const employees = await pool.query('SELECT name, status FROM "Employee"');
    console.log('Employee Table:', employees.rows);
    
    const users = await pool.query("SELECT name, status FROM users WHERE role != 'SUPER_ADMIN'");
    console.log('Users Table:', users.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
