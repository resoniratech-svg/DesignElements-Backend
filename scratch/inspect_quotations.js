const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trek_database_d',
  password: 'Akanksha123',
  port: 5433,
});

async function checkQuotations() {
  const res = await pool.query(`
    SELECT id, qtn_number, division, client_id
    FROM quotations
    LIMIT 20
  `);
  console.log('Quotations:', JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

checkQuotations().catch(err => {
    console.error(err);
    process.exit(1);
});
