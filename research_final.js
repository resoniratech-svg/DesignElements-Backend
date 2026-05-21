require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

async function checkColumns(tableName) {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
    `, [tableName]);
    
    console.log(`\n--- ${tableName} ---`);
    res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));
  } catch (err) {
    console.error(`Error checking ${tableName}:`, err.message);
  }
}

async function run() {
  await checkColumns('users');
  await checkColumns('expense');
  await checkColumns('payments');
  await checkColumns('invoices');
  await checkColumns('proposals');
  await checkColumns('clients');
  process.exit(0);
}

run();
