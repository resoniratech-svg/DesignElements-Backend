const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'client_id' 
      AND table_schema = 'public'
    `);
    console.log('TABLES WITH client_id:', res.rows.map(row => row.table_name));

    const res2 = await pool.query(`
      SELECT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'user_id' 
      AND table_schema = 'public'
    `);
    console.log('TABLES WITH user_id:', res2.rows.map(row => row.table_name));

    const res3 = await pool.query(`
      SELECT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'manager_id' 
      AND table_schema = 'public'
    `);
    console.log('TABLES WITH manager_id:', res3.rows.map(row => row.table_name));

  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await pool.end();
  }
}

check();
