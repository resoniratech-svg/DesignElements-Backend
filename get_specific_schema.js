const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

async function run() {
  const tables = ['users', 'clients', 'invoices', 'proposals', 'expense', 'payments'];
  for (const table of tables) {
    try {
      const res = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
      `, [table]);
      console.log(`\nTable: ${table}`);
      res.rows.forEach(r => console.log(`- ${r.column_name}: ${r.data_type}`));
    } catch (e) {
      console.error(`Error for ${table}:`, e.message);
    }
  }
  process.exit(0);
}

run();
