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
  const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'boq' ORDER BY ordinal_position");
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
