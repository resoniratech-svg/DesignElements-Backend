require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

async function main() {
  try {
    console.log("Altering 'invoices' table to add 'invoice_type'...");
    await pool.query(`
      ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) DEFAULT 'Credit'
    `);
    console.log("Successfully added 'invoice_type' column.");

    // Verify
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'invoice_type'");
    console.log("Verification result:", res.rows);

  } catch (err) {
    console.error("Error altering table:", err);
  } finally {
    await pool.end();
  }
}

main();
