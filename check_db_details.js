require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const r = await pool.query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5");
  console.log("Recent Notifications:", r.rows);
  
  const c = await pool.query("SELECT column_name, column_default FROM information_schema.columns WHERE table_name = 'notifications'");
  console.log("Column Defaults:", c.rows);
  
  await pool.end();
}
check();
