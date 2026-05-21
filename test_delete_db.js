const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' });

async function main() {
  const client = await pool.connect();
  try {
    const id = 11; // An invoice id, let's just test with a random existing one, e.g., 7
    const resultInvoices = await client.query('SELECT id FROM invoices LIMIT 1');
    if (resultInvoices.rows.length > 0) {
      const invoiceId = resultInvoices.rows[0].id;
      console.log(`Found invoice ${invoiceId}, attempting delete...`);
      await client.query("BEGIN");
      await client.query("DELETE FROM invoice_items WHERE invoice_id = $1", [invoiceId]);
      await client.query("DELETE FROM payments WHERE invoice_id = $1", [invoiceId]);
      await client.query("DELETE FROM invoices WHERE id = $1", [invoiceId]);
      await client.query("ROLLBACK"); // We roll back because this is just a test
      console.log("Delete transaction simulating SUCCESS!");
    } else {
      console.log("No invoices found to delete.");
    }
  } catch (err) {
    console.error("DB DELETE ERROR:", err);
  } finally {
    client.release();
    pool.end();
  }
}
main();
