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
  const trgRes = await pool.query(`
    SELECT 
      tgname as trigger_name,
      pg_get_triggerdef(pg_trigger.oid) as trigger_definition
    FROM pg_trigger
    JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
    WHERE pg_class.relname = 'boq'
    AND NOT tgisinternal
  `);
  console.log("Trigger Definitions for 'boq':");
  console.log(JSON.stringify(trgRes.rows, null, 2));

  const ruleRes = await pool.query(`
    SELECT * FROM pg_rules WHERE tablename = 'boq'
  `);
  console.log("\nRules for 'boq':");
  console.log(JSON.stringify(ruleRes.rows, null, 2));

  const checkColRes = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'boq'
    ORDER BY ordinal_position
  `);
  console.log("\nFull Columns Schema for 'boq':");
  console.log(JSON.stringify(checkColRes.rows, null, 2));

  await pool.end();
}

main().catch(console.error);
