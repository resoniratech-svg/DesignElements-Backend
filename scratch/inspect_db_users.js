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
    const res = await client.query("SELECT id, name, email, password_hash, password_plain FROM users WHERE email = 'admin@erp.com'");
    console.log("Admin details:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
