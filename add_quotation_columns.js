const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function addColumns() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const queries = [
      "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS attn VARCHAR(255);",
      "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS attn_designation VARCHAR(255);",
      "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS salutation VARCHAR(255);",
      "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS reference_no VARCHAR(255);",
      "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS intro_text TEXT;",
      "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tc_terms TEXT;",
      "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tc_payment TEXT;",
      "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tc_delivery TEXT;",
      "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tc_validity TEXT;",
      "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS outro_text TEXT;",
      "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS salesman VARCHAR(255);",
      "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS salesman_designation VARCHAR(255);",
      "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS salesman_phone VARCHAR(255);",
      "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS salesman_email VARCHAR(255);"
    ];

    for (const q of queries) {
      await client.query(q);
      console.log('Executed:', q);
    }

    await client.query('COMMIT');
    console.log('Successfully added all columns.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

addColumns();
