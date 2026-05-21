require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});
async function run() {
  const result = await pool.query("SELECT * FROM projects");
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
}
run();
