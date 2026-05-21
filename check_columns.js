const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' });

async function check() {
  const res = await pool.query("SELECT column_name, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'invoices' AND column_name IN ('is_deleted', 'division', 'division_id')");
  console.log(res.rows);
  process.exit(0);
}
check();
