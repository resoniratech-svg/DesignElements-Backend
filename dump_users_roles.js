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
  const query = `
      SELECT u.id, u.name, u.email, u.sector, u.division, r.name as role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.id ASC
  `;
  const result = await pool.query(query);
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
