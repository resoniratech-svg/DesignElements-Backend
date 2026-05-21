const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

const checkSchema = async () => {
  try {
    const clientsCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'clients'");
    console.log('CLIENTS_COLS:', clientsCols.rows.map(r => r.column_name).join(', '));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkSchema();
