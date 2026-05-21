import { pool } from "./config/db";
async function run() {
  try {
    const res = await pool.query("SELECT * FROM payments");
    console.log("ROWS:", JSON.stringify(res.rows, null, 2));
  } catch (err: any) {
    console.log("SELECT FAIL:", err.message);
  }
  process.exit(0);
}
run();
