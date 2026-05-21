const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

async function verify() {
  const tables = ['users', 'clients', 'invoices', 'proposals', 'internal_expenses', 'payments'];
  for (const table of tables) {
    try {
      const res = await pool.query(`
        SELECT column_name, data_type, udt_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        AND column_name IN ('division', 'status')
      `, [table]);
      console.log(`\nTable: ${table}`);
      res.rows.forEach(r => console.log(`- ${r.column_name}: ${r.data_type} (Type: ${r.udt_name})`));
    } catch (e) {
      console.error(`Error for ${table}:`, e.message);
    }
  }

  // Check unique constraints
  try {
    const res = await pool.query(`
      SELECT conname, contype 
      FROM pg_constraint 
      WHERE conname IN ('uq_invoice_division_number', 'uq_proposal_division_number')
    `);
    console.log(`\nConstraints:`);
    res.rows.forEach(r => console.log(`- ${r.conname}: ${r.contype}`));
  } catch (e) {
    console.error(`Error for constraints:`, e.message);
  }

  process.exit(0);
}

verify();
