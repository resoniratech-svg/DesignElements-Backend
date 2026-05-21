const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});
async function audit() {
  const result = {};
  const tables = ['users', 'clients', 'invoices', 'proposals', 'internal_expenses', 'payments'];
  for (const table of tables) {
    try {
      const res = await pool.query(`
        SELECT column_name, data_type, udt_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
      `, [table]);
      result[table] = res.rows;
    } catch (e) {
      result[table] = { error: e.message };
    }
  }
  fs.writeFileSync('db_audit_result.json', JSON.stringify(result, null, 2));
  process.exit(0);
}
audit();
