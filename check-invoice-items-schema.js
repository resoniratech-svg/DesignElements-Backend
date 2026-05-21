const { pool } = require('./dist/config/db');
const fs = require('fs');

async function checkInvoiceItemsSchema() {
  try {
    const result = await pool.query(
      `SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'invoice_items';`
    );
    fs.writeFileSync('invoice_items_schema.txt', JSON.stringify(result.rows, null, 2));
  } catch (err) {
    fs.writeFileSync('invoice_items_schema.txt', err.stack);
  }
  process.exit(0);
}

checkInvoiceItemsSchema();
