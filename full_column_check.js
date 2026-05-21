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
  const invCols = await pool.query(`
    SELECT column_name, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'invoices'
  `);
  console.log("INVOICES COLUMNS (Full):");
  invCols.rows.forEach(c => {
    console.log(`- ${c.column_name}: ${c.is_nullable} (Default: ${c.column_default})`);
  });

  const itemCols = await pool.query(`
    SELECT column_name, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'invoice_items'
  `);
  console.log("\nINVOICE_ITEMS COLUMNS (Full):");
  itemCols.rows.forEach(c => {
    console.log(`- ${c.column_name}: ${c.is_nullable} (Default: ${c.column_default})`);
  });

  await pool.end();
}

main().catch(console.error);
