const { Client } = require('pg');
const client = new Client({ user: 'postgres', password: 'root', host: '127.0.0.1', port: 5433, database: 'erp_backend_restored' });

async function run() {
  await client.connect();
  console.log('Connected to DB');

  try {
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS qid_doc_url TEXT,
      ADD COLUMN IF NOT EXISTS cr_doc_url TEXT,
      ADD COLUMN IF NOT EXISTS computer_card_doc_url TEXT,
      ADD COLUMN IF NOT EXISTS contract_doc_url TEXT;
    `);
    console.log('Updated users table');

    await client.query(`
      ALTER TABLE client_licenses
      ADD COLUMN IF NOT EXISTS document_url TEXT;
    `);
    console.log('Updated client_licenses table');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
