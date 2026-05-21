const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS contact_number VARCHAR(100);");
    await client.query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_note VARCHAR(255);");
    console.log("Columns added successfully");
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}
run();
