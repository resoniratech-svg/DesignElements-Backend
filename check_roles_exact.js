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
    const res = await pool.query("SELECT id, name FROM roles");
    console.log('ROLES_DATA:');
    res.rows.forEach(r => console.log(`'${r.id}': '${r.name}'`));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
check();
