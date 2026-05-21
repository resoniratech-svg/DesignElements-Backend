const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored"
});

async function runMigration() {
  try {
    await pool.query(`
      ALTER TABLE expense_allocations ALTER COLUMN division TYPE varchar(50);
    `);
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
