import { pool } from "./config/db";

async function migrate() {
  try {
    console.log("Adding missing columns to quotations table...");
    await pool.query("ALTER TABLE quotations ADD COLUMN IF NOT EXISTS selected_format VARCHAR(50)");
    await pool.query("ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tc_installation TEXT");
    await pool.query("ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50)");
    await pool.query("ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_email VARCHAR(255)");
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

migrate();
