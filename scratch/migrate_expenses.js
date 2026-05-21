const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored"
});

async function runMigration() {
  try {
    await pool.query(`
      ALTER TABLE internal_expenses RENAME COLUMN status TO approval_status;
      ALTER TABLE internal_expenses ADD COLUMN IF NOT EXISTS attachment text;
      ALTER TABLE internal_expenses ADD COLUMN IF NOT EXISTS notes text;
      ALTER TABLE internal_expenses ADD COLUMN IF NOT EXISTS vendor text;
      ALTER TABLE internal_expenses ADD COLUMN IF NOT EXISTS payment_method text;
      ALTER TABLE internal_expenses ADD COLUMN IF NOT EXISTS tax_rate numeric;
      ALTER TABLE internal_expenses ADD COLUMN IF NOT EXISTS tax_amount numeric;
      ALTER TABLE internal_expenses ADD COLUMN IF NOT EXISTS reference_id text;
    `);
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
