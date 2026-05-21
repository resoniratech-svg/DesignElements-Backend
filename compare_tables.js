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
  const res = await pool.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('boq', 'boqs') ORDER BY table_name, ordinal_position");
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
