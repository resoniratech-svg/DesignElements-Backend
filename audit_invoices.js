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
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      ORDER BY ordinal_position
    `);
    console.log("INVOICES SCHEMA:");
    console.log(JSON.stringify(res.rows, null, 2));

    const trg = await pool.query(`
      SELECT tgname, pg_get_triggerdef(oid) 
      FROM pg_trigger 
      WHERE tgrelid = 'invoices'::regclass
    `);
    console.log("\nINVOICES TRIGGERS:");
    console.log(JSON.stringify(trg.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
