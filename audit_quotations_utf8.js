const { Client } = require('pg');
const fs = require('fs');
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
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'quotations'
      ORDER BY ordinal_position;
    `);
    fs.writeFileSync('quotations_schema_full.json', JSON.stringify(res.rows, null, 2), 'utf8');
    console.log('Schema saved to quotations_schema_full.json');
    await client.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
