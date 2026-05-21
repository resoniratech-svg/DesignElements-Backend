const { Pool } = require('pg');
require('dotenv').config({ path: 'c:/Users/kanek/Downloads/Treknewsrs_1-main/.env' });

const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'erp_backend_restored',
  password: 'root',
  port: 5433
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS internal_expenses (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        category VARCHAR(100),
        description TEXT,
        total_amount DECIMAL(15,2),
        date TIMESTAMP,
        allocation_type VARCHAR(50),
        approval_status VARCHAR(50),
        vendor VARCHAR(100),
        payment_method VARCHAR(100),
        tax_rate DECIMAL(5,2),
        tax_amount DECIMAL(15,2),
        reference_id VARCHAR(100),
        attachment TEXT,
        notes TEXT,
        user_id UUID,
        expense_type VARCHAR(50),
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expense_allocations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        expense_id UUID REFERENCES internal_expenses(id) ON DELETE CASCADE,
        division VARCHAR(50),
        percentage DECIMAL(5,2),
        amount DECIMAL(15,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Tables created successfully.");
  } catch (err) {
    console.error(err.message);
  } finally {
    pool.end();
  }
}

run();
