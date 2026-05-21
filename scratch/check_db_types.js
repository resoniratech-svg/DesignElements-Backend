const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored"
});

async function checkTypes() {
  try {
    const res = await pool.query(`
      SELECT typname, enumlabel 
      FROM pg_type 
      JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid
      WHERE typname IN ('division_type', 'expense_status', 'status');
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkTypes();
