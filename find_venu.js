require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const r = await pool.query("SELECT id, name, email, role FROM users WHERE name ILIKE '%venu%' OR email ILIKE '%venu%'");
  console.log("Venu users:", r.rows);
  
  const n = await pool.query("SELECT * FROM notifications WHERE user_id IN (SELECT user_id FROM clients WHERE name ILIKE '%venu%') ORDER BY created_at DESC");
  console.log("Notifications for venu's client user_id:", n.rows);
  
  await pool.end();
}
check();
