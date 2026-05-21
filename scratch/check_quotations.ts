import pool from "../src/config/db";

async function main() {
  try {
    const { rows } = await pool.query("SELECT id, qtn_number, client_id, status FROM quotations ORDER BY created_at DESC LIMIT 5");
    console.log("Recent Quotations:", rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
main();
