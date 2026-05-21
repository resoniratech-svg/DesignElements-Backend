import { pool } from "./config/db";
async function run() {
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices'");
  console.log("INVOICES COLS:", res.rows.map(x => x.column_name));
  process.exit(0);
}
run();
