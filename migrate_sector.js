require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

async function main() {
  console.log('Adding sector column to clients table...');
  await pool.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS sector character varying;');
  console.log('Success.');
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
