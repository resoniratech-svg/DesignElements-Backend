import { pool } from "./config/db";
async function run() {
  const client = await pool.connect();
  const res = await client.query("SELECT current_database(), current_user, inet_server_port()");
  console.log("CONN:", res.rows[0]);
  client.release();
  process.exit(0);
}
run();
