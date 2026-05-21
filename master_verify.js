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
  const res = await pool.query(`
    SELECT id, project_name, subtotal, tax_amount, discount, total_amount, items 
    FROM boq 
    WHERE project_name = 'Backend Calculation Project'
    ORDER BY id DESC LIMIT 1
  `);
  console.log("Master Verification:");
  console.log(JSON.stringify(res.rows[0], null, 2));
  await pool.end();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
