const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT)
});
pool.query("SELECT * FROM \"EmployeeDocument\" LIMIT 5").then(res => {
  console.log('EmployeeDocument data:', res.rows);
  return pool.query("SELECT * FROM \"Employee\" LIMIT 5");
}).then(res => {
  console.log('Employee data:', res.rows);
  pool.end();
}).catch(console.error);
