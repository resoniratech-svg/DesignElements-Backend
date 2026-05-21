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
    // Check if CON-QUO-001 already exists for CONTRACTING
    const res = await client.query("SELECT id FROM quotations WHERE qtn_number = 'CON-QUO-001' AND division = 'CONTRACTING'");
    console.log(JSON.stringify(res.rows, null, 2));

    // Also check other divisions
    const res2 = await client.query("SELECT qtn_number, division FROM quotations WHERE qtn_number = 'CON-QUO-001'");
    console.log('--- ALL DIVISIONS ---');
    console.log(JSON.stringify(res2.rows, null, 2));

    await client.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
