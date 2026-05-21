import { pool } from "./config/db";
async function run() {
  const conn = await pool.query("SELECT current_database(), current_user, inet_server_port()");
  console.log("CONN:", conn.rows[0]);
  
  const tables = await pool.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'payments'");
  console.log("PAYMENTS TABLES:", tables.rows);
  
  process.exit(0);
}
run();
