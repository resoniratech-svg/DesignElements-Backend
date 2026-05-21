import { pool } from "./config/db";
async function run() {
  const res = await pool.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'payments'");
  console.log("PAYMENTS TABLE LOCATIONS:", JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
run();
