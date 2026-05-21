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
      ALTER TABLE internal_expenses
      ALTER COLUMN user_id TYPE INTEGER USING user_id::text::integer;
    `);
    console.log("Column altered.");
  } catch (err) {
    if (err.message.includes('cannot cast type uuid to integer')) {
        await pool.query(`
            ALTER TABLE internal_expenses
            DROP COLUMN user_id,
            ADD COLUMN user_id INTEGER;
        `);
        console.log("Column dropped and added as integer.");
    } else {
        console.error(err.message);
    }
  } finally {
    pool.end();
  }
}

run();
