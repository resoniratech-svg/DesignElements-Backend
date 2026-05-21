const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' });

async function check() {
  const tables = ['invoices', 'quotations', 'internal_expenses', 'activity_logs', 'payments'];
  for (const table of tables) {
    const res = await pool.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name IN ('division', 'division_id', 'is_deleted')`);
    console.log(`Table: ${table}`);
    console.log(res.rows);
  }
  process.exit(0);
}
check();
