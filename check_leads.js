const { pool } = require('./dist/config/db');
async function check() {
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'");
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
check();
