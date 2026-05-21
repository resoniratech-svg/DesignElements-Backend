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
    console.log("Altering 'invoices' table to add missing metadata columns...");
    await pool.query(`
      ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS lpo_no VARCHAR(255),
      ADD COLUMN IF NOT EXISTS salesman VARCHAR(255),
      ADD COLUMN IF NOT EXISTS qid VARCHAR(255),
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS ref_type VARCHAR(255),
      ADD COLUMN IF NOT EXISTS ref_no VARCHAR(255),
      ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending'
    `);
    console.log("Successfully updated 'invoices' table schema.");

    // Verify
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices'");
    console.log("Current columns:", res.rows.map(r => r.column_name).join(', '));

  } catch (err) {
    console.error("Error altering table:", err);
  } finally {
    await pool.end();
  }
}

main();
