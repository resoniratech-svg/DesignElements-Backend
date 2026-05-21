import { pool } from "./config/db";
async function run() {
  const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  res.rows.forEach(r => console.log(r.table_name));
  process.exit(0);
}
run();
