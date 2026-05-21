import { pool } from "./config/db";
async function run() {
  const res = await pool.query("SELECT id, invoice_number, total_amount FROM invoices WHERE invoice_number ILIKE '%1001%'");
  console.log(res.rows);
  process.exit(0);
}
run();
