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
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices'");
  console.log("INVOICES COLUMNS:");
  res.rows.forEach(r => console.log(r.column_name));
  
  const res2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'invoice_items'");
  console.log("\nINVOICE_ITEMS COLUMNS:");
  res2.rows.forEach(r => console.log(r.column_name));
  
  await pool.end();
}

main().catch(console.error);
