import { pool } from "./config/db";
async function run() {
  for (const table of ['payments', 'ledger_entries']) {
    const res = await pool.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`);
    console.log(`COLUMNS FOR ${table}:`, JSON.stringify(res.rows, null, 2));
  }
  process.exit(0);
}
run();
