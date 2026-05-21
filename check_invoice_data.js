const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' });

async function check() {
  try {
    const res = await pool.query("SELECT id, invoice_number, division, status, is_deleted FROM invoices ORDER BY created_at DESC LIMIT 5");
    console.log("Invoices records:");
    res.rows.forEach(r => {
      console.log(`ID: ${r.id}, Num: ${r.invoice_number}, Div: ${r.division}, Status: ${r.status}, Deleted: ${r.is_deleted}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
