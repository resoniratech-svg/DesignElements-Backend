const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'erp_backend_restored',
  password: 'root',
  port: 5433
});

async function run() {
  try {
    await client.connect();
    
    console.log('--- ENUM VALUES FOR division_type ---');
    const res = await client.query(`
      SELECT e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'division_type'
      ORDER BY e.enumsortorder;
    `);
    console.log(JSON.stringify(res.rows, null, 2));

    console.log('\n--- ENUM VALUES FOR approval_status ---');
    const res2 = await client.query(`
      SELECT e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'approval_status'
      ORDER BY e.enumsortorder;
    `);
    console.log(JSON.stringify(res2.rows, null, 2));

    await client.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
