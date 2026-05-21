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
    const clientsCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clients'");
    console.log('CLIENTS_COLS:', JSON.stringify(clientsCols.rows, null, 2));
    
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('TABLES:', JSON.stringify(tables.rows.map(r => r.table_name), null, 2));

    const auditCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'audit_logs'");
    console.log('AUDIT_LOGS_COLS:', JSON.stringify(auditCols.rows, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkSchema();
