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
    SELECT 
      trg.tgname as trigger_name,
      p.proname as function_name,
      p.prosrc as function_body
    FROM pg_trigger trg
    JOIN pg_class cls ON trg.tgrelid = cls.oid
    JOIN pg_proc p ON trg.tgfoid = p.oid
    WHERE cls.relname = 'boq'
  `);
  
  console.log("BOQ Table Triggers:");
  console.log(JSON.stringify(res.rows, null, 2));
  
  await pool.end();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
