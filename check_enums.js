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
    const res = await pool.query("SELECT n.nspname as schema, t.typname as type FROM pg_type t LEFT JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typtype = 'e'");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
check();
