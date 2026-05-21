require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

async function main() {
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  const tableNames = tables.rows.map(r => r.table_name);
  
  const expected = [
    'activity_logs', 'approvals', 'client_licenses', 'internal_expenses',
    'expense_allocations', 'doc_counters', 'invoices', 'invoice_items',
    'clients', 'payments', 'projects', 'ledger_entries', 'notifications',
    'roles', 'client_agreements', 'project_expenses', 'proposals',
    'proposal_items', 'users', 'boqs', 'boq_items'
  ];
  
  const missing = expected.filter(t => !tableNames.includes(t));
  
  console.log('Tables found:', tableNames);
  console.log('Missing tables:', missing);
  
  fs.writeFileSync('missing_tables.json', JSON.stringify({ found: tableNames, missing }, null, 2));
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
