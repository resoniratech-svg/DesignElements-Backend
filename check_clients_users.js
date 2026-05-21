require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool();

async function check() {
  const users = await pool.query("SELECT id, name, email, role FROM users WHERE role = 'CLIENT'");
  const clients = await pool.query("SELECT id, name, email, user_id FROM clients");
  const notifications = await pool.query("SELECT * FROM notifications");

  console.log("Users:", users.rows);
  console.log("Clients:", clients.rows);
  console.log("Notifications:", notifications.rows);
  process.exit(0);
}
check();
