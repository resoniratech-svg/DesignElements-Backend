const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to", process.env.DATABASE_URL);
    
    const rolesRes = await client.query("SELECT id, name FROM roles");
    console.log("Roles in Database:");
    console.log(rolesRes.rows);
    
    const usersRes = await client.query(`
      SELECT u.id, u.name, u.email, u.password_plain, r.name as role 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      LIMIT 20
    `);
    console.log("\nUsers in Database:");
    console.log(usersRes.rows);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
