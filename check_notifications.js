require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    // Check notifications table schema
    const schema = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      ORDER BY ordinal_position
    `);
    console.log("=== Notifications Table Schema ===");
    console.log(schema.rows);

    // Check all notifications
    const notifs = await pool.query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10");
    console.log("\n=== Recent Notifications ===");
    console.log(notifs.rows);

    // Check users with CLIENT role
    const clients = await pool.query("SELECT id, name, email, role FROM users WHERE role = 'CLIENT'");
    console.log("\n=== Client Users ===");
    console.log(clients.rows);

    // Check client table user_id mappings
    const clientMap = await pool.query("SELECT id, name, email, user_id FROM clients");
    console.log("\n=== Clients Table (user_id mappings) ===");
    console.log(clientMap.rows);

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}
check();
