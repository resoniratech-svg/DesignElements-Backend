const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored"
});

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'internal_expenses';
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSchema();
