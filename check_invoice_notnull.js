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
  const res = await pool.query(`
    SELECT column_name, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'invoices' 
    AND is_nullable = 'NO'
    AND column_default IS NULL
  `);
  console.log("REQUIRED COLUMNS (NOT NULL, NO DEFAULT):");
  console.log(JSON.stringify(res.rows, null, 2));
  
  const allCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices'");
  console.log("\nALL COLUMNS:");
  console.log(allCols.rows.map(r => r.column_name).join(", "));

  await pool.end();
}

main().catch(console.error);
