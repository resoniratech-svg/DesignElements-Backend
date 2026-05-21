const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});
async function test() {
  try {
    const res = await pool.query(
      "INSERT INTO users (name, email, role, division) VALUES ('Test User', 'test@test.com', 'CLIENT', 'service') RETURNING *"
    );
    console.log("Success:", res.rows[0]);
  } catch (e) {
    console.error("Failed:", e.message);
  }
  process.exit(0);
}
test();
