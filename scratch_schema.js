const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT)
});
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'EmployeeDocument'").then(res => {
  console.log('EmployeeDocument columns:', res.rows);
  return pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Employee'");
}).then(res => {
  console.log('Employee columns:', res.rows);
  pool.end();
}).catch(console.error);
