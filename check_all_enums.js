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
    
    console.log('--- ENUM VALUES ---');
    const res = await client.query(`
      SELECT 
        n.nspname AS schema,
        t.typname AS enum_name,
        e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      ORDER BY enum_name, e.enumsortorder;
    `);
    console.log(JSON.stringify(res.rows, null, 2));

    await client.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
