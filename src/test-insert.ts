import { pool } from "./config/db";
async function run() {
  try {
    const res = await pool.query(
      "INSERT INTO payments (invoice_id, amount, payment_date, method, notes) VALUES ($1, $2, NOW(), $3, $4) RETURNING *",
      [73, 8, "Cash", "Test note"]
    );
    console.log("INSERT OK:", res.rows[0]);
  } catch (err: any) {
    console.log("INSERT FAIL:", err.message);
  }
  process.exit(0);
}
run();
