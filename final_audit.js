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
    const tableList = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("ALL TABLES:", tableList.rows.map(r => r.table_name).join(', '));

    const invoiceCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices'");
    console.log("INVOICE COLUMNS:", invoiceCols.rows.map(r => r.column_name).join(', '));

    const itemTable = tableList.rows.find(r => r.table_name === 'invoice_items');
    if (itemTable) {
        const itemCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'invoice_items'");
        console.log("INVOICE_ITEM COLUMNS:", itemCols.rows.map(r => r.column_name).join(', '));
    } else {
        console.log("invoice_items table DOES NOT EXIST.");
    }

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
