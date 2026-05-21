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
    // Get all indexes on quotations table
    const res = await client.query(`
      SELECT 
        idx.relname as index_name,
        i.indisunique as is_unique,
        pg_get_indexdef(i.indexrelid) as index_definition
      FROM pg_index i
      JOIN pg_class t ON t.oid = i.indrelid
      JOIN pg_class idx ON idx.oid = i.indexrelid
      WHERE t.relname = 'quotations';
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
