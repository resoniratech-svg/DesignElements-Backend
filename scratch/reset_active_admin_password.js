const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const newHash = await bcrypt.hash('Admin@123', 10);
    const res = await pool.query(
      `UPDATE users SET password_hash = $1 WHERE email = 'admin@erp.com' RETURNING *`,
      [newHash]
    );
    console.log("Updated rows:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
