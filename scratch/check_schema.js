const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function check() {
  try {
    const clients = await pool.query('SELECT * FROM clients LIMIT 1');
    console.log('CLIENTS COLUMNS:', Object.keys(clients.rows[0] || {}));
    
    const users = await pool.query('SELECT * FROM users LIMIT 1');
    console.log('USERS COLUMNS:', Object.keys(users.rows[0] || {}));
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await pool.end();
  }
}

check();
