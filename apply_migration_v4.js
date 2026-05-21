const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

const applyMigration = async () => {
  const sql = fs.readFileSync(path.join(__dirname, 'migration_v4_audit_credit.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('Migration v4 (Audit & Credit) applied successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

applyMigration();
