const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' });

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT total_amount, amount_paid, balance_amount, division FROM invoices');
    console.log(`Invoices count: ${res.rows.length}`);
    console.log(res.rows);
  } catch (err) {
    console.error("DB QUERY ERROR:", err);
  } finally {
    client.release();
    pool.end();
  }
}
main();
