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
    const res = await pool.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'id'");
    console.log('INVOICE_ID_TYPE:', res.rows[0]?.data_type);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
check();
