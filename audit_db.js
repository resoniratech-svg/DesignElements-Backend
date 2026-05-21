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
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("TABLES:", tables.rows.map(r => r.table_name).join(', '));

    const invoiceCols = await pool.query("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'invoices' ORDER BY ordinal_position");
    console.log("\nINVOICES COLUMNS:", JSON.stringify(invoiceCols.rows, null, 2));

    const triggers = await pool.query(`
      SELECT tgname, pg_get_triggerdef(oid) 
      FROM pg_trigger 
      WHERE tgrelid = 'invoices'::regclass
    `);
    console.log("\nINVOICES TRIGGERS:", JSON.stringify(triggers.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
