const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

const check = async () => {
  try {
    const res = await pool.query("SELECT id, status FROM boq WHERE id = 11");
    if (res.rows.length > 0) {
      console.log(`STATUS: '${res.rows[0].status}'`);
    } else {
      console.log('BOQ #11 NOT FOUND');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
check();
