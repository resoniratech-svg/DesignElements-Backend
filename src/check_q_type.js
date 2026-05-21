const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  const result = await pool.query(`
    SELECT 
      column_name, 
      udt_name 
    FROM information_schema.columns 
    WHERE table_name = 'quotations' 
    AND column_name = 'status'
  `);
  console.log('COLUMN TYPE INFO:', result.rows);
  pool.end();
}

check();
