const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'erp_backend_restored',
  password: 'root',
  port: 5433,
});

async function check() {
  try {
    const res = await pool.query("SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name IN ('boqs', 'boq_items', 'users') ORDER BY table_name, ordinal_position");
    res.rows.forEach(row => {
        console.log(`${row.table_name}: ${row.column_name} (${row.data_type}) NULL:${row.is_nullable}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
