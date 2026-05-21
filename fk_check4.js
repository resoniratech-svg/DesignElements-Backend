const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' });

async function main() {
  const result = await pool.query(`
    SELECT *
    FROM information_schema.columns
    WHERE table_name = 'ledger_entries' AND column_name = 'invoice_id';
  `);
  console.log("Does ledger_entries have an invoice_id column?");
  console.log(result.rows);
  pool.end();
}
main();
