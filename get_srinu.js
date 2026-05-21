require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});
async function run() {
  const result = await pool.query("SELECT u.id, u.name, u.email, u.division, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.name ILIKE '%srinu%' OR u.email ILIKE '%srinu%'");
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
}
run();
