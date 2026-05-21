const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkClients() {
  try {
    console.log("Listing last 10 clients from 'clients' table:");
    const res = await pool.query("SELECT id, name, email, contact_person, created_at, division FROM clients ORDER BY created_at DESC LIMIT 10");
    console.table(res.rows);

    console.log("\nListing last 10 clients from 'users' table (where role='CLIENT'):");
    const resUsers = await pool.query(`
      SELECT u.id, u.name, u.email, u.company_name, u.created_at, u.division 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE r.name = 'CLIENT' 
      ORDER BY u.created_at DESC LIMIT 10
    `);
    console.table(resUsers.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkClients();
