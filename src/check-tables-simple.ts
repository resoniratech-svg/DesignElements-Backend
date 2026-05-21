import { pool } from "./config/db";
async function run() {
  const tables = ['users', 'invoices', 'payments', 'ledger_entries', 'activity_logs', 'notifications'];
  for (const table of tables) {
    try {
      await pool.query(`SELECT 1 FROM ${table} LIMIT 1`);
      console.log(`OK: ${table}`);
    } catch (err: any) {
      console.log(`FAIL: ${table} - ${err.message}`);
    }
  }
  process.exit(0);
}
run();
