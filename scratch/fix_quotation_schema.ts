import pool from "../src/config/db";

async function main() {
  try {
    await pool.query("ALTER TABLE quotations ALTER COLUMN client_id DROP NOT NULL");
    console.log("Successfully made quotations.client_id nullable");
  } catch (err) {
    console.error("Error altering table:", err);
  } finally {
    pool.end();
  }
}
main();
