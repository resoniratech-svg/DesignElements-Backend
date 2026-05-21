const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});
async function check() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    console.log("Columns in 'users':");
    console.dir(res.rows.map(r => r.column_name), { maxArrayLength: null });
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("Tables in DB:");
    console.dir(tables.rows.map(t => t.table_name), { maxArrayLength: null });
  } catch (e) {
    console.error("Query failed:", e.message);
  }
  process.exit(0);
}
check();
