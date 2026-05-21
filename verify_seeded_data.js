const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});
async function verify() {
  try {
    const res = await pool.query(
        "SELECT name, email, role, division FROM users WHERE role = 'CLIENT' ORDER BY id DESC LIMIT 10"
    );
    console.log("Seeded Clients in Database:");
    console.dir(res.rows, { depth: null, colors: true });
  } catch (e) {
    console.error("Verification failed:", e.message);
  }
  process.exit(0);
}
verify();
