const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored"
});

async function checkAllocations() {
  try {
    const res = await pool.query(`
      SELECT column_name, character_maximum_length, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'expense_allocations';
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkAllocations();
