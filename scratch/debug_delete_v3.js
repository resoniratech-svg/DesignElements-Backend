const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function testDelete() {
  const clientId = 32;
  const client = await pool.connect();
  try {
    console.log('Testing DELETE for Client ID:', clientId);
    await client.query("BEGIN");

    const tablesWithClientId = [
        'boqs', 'projects', 'invoices', 'sales_orders', 'quotations', 
        'credit_requests', 'proposals', 'ledger_entries', 'users'
    ];

    for (const table of tablesWithClientId) {
        console.log(`Checking ${table}...`);
        try {
            await client.query(`UPDATE ${table} SET client_id = NULL WHERE client_id = $1`, [clientId]);
            console.log(`  ${table} updated.`);
        } catch (e) {
            console.log(`  ${table} FAILED: ${e.message}`);
        }
    }

    console.log('ROLLBACK (Test mode)');
    await client.query("ROLLBACK");
  } catch (err) {
    console.error('GLOBAL ERROR:', err.message);
    await client.query("ROLLBACK");
  } finally {
    client.release();
    await pool.end();
  }
}

testDelete();
