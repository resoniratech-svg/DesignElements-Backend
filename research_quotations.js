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
    
    console.log('--- PROPOSALS COLUMNS ---');
    const propRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'proposals'
      ORDER BY ordinal_position;
    `);
    console.log(JSON.stringify(propRes.rows, null, 2));

    console.log('\n--- QUOTATIONS CONSTRAINTS ---');
    const constRes = await client.query(`
      SELECT 
        conname as constraint_name, 
        pg_get_constraintdef(c.oid) as constraint_definition
      FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      WHERE r.relname = 'quotations';
    `);
    console.log(JSON.stringify(constRes.rows, null, 2));

    await client.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
