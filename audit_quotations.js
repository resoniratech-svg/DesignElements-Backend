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
    const res = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'quotations'
      ORDER BY ordinal_position;
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    
    const constraints = await client.query(`
      SELECT 
        conname as constraint_name, 
        contype as constraint_type,
        pg_get_constraintdef(c.oid) as constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      JOIN pg_class r ON r.oid = c.conrelid
      WHERE r.relname = 'quotations';
    `);
    console.log('\n--- CONSTRAINTS ---');
    console.log(JSON.stringify(constraints.rows, null, 2));
    
    await client.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
