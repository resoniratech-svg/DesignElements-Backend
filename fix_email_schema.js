const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function fixSchema() {
  try {
    console.log("Altering users table to make email optional...");
    await pool.query('ALTER TABLE users ALTER COLUMN email DROP NOT NULL');
    console.log("Success!");
    process.exit(0);
  } catch (err) {
    console.error("Error altering table:", err);
    process.exit(1);
  }
}

fixSchema();
