const { Pool } = require('pg');
require('dotenv').config({ path: 'c:/Users/kanek/Downloads/Treknewsrs_1-main/.env' });

const pool = new Pool();

async function run() {
  try {
    console.log("Adding columns to internal_expenses...");
    await pool.query(`
      ALTER TABLE internal_expenses 
      ADD COLUMN IF NOT EXISTS user_id UUID references users(id),
      ADD COLUMN IF NOT EXISTS expense_type VARCHAR(50);
    `);
    console.log("Success! Columns added.");
  } catch (err) {
    console.error("Error updating schema:", err.message);
  } finally {
    pool.end();
  }
}

run();
