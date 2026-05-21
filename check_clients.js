const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

async function checkClients() {
  try {
    const res = await pool.query("SELECT id, name, role, division FROM users WHERE role = 'CLIENT'");
    console.log("Clients in 'users' table:");
    res.rows.forEach(r => console.log(`- ID: ${r.id}, Name: ${r.name}, Division: ${r.division}`));
    
    if (res.rows.length === 0) {
      console.log("\nWARNING: No clients found in 'users' table. Trying to find any users...");
      const allUsers = await pool.query("SELECT id, name, role, division FROM users LIMIT 10");
      allUsers.rows.forEach(r => console.log(`- ID: ${r.id}, Name: ${r.name}, Role: ${r.role}, Division: ${r.division}`));
    }
  } catch (e) {
    console.error("Error checking clients:", e.message);
  }
  process.exit(0);
}

checkClients();
