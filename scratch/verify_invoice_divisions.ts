import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT DISTINCT division FROM invoices
    `);
    console.log("Unique divisions in invoices table:");
    console.log(JSON.stringify(res.rows, null, 2));
    
    const sample = await pool.query(`
      SELECT id, invoice_number, division FROM invoices LIMIT 5
    `);
    console.log("Sample data:");
    console.log(JSON.stringify(sample.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
