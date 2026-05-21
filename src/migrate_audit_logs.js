const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting migration: Altering entity_id type in audit_logs...');
    
    await client.query('BEGIN');
    
    // Convert entity_id to VARCHAR(255) to support both Integer and UUID IDs
    await client.query('ALTER TABLE audit_logs ALTER COLUMN entity_id TYPE VARCHAR(255);');
    
    await client.query('COMMIT');
    
    console.log('SUCCESS: audit_logs.entity_id successfully changed to VARCHAR(255).');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('MIGRATION FAILED:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
