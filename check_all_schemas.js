const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'erp_backend_restored',
  password: 'root',
  port: 5433,
});

const tables = ['projects', 'quotations', 'invoices', 'boqs'];

async function checkSchemas() {
  for (const t of tables) {
    try {
      const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${t}';`);
      console.log(`Table: ${t}`, res.rows.map(r => r.column_name));
    } catch (err) {
      console.error(`Error checking ${t}:`, err.message);
    }
  }
  await pool.end();
}

checkSchemas();
