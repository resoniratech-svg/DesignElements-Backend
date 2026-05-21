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
    
    console.log('--- DOC COUNTERS ---');
    const res = await client.query("SELECT * FROM doc_counters");
    console.log(JSON.stringify(res.rows, null, 2));

    console.log('\n--- QUOTATIONS COUNT BY DIVISION ---');
    const res2 = await client.query(`
      SELECT division, MAX(SUBSTRING(qtn_number FROM '[0-9]+$')::INTEGER) as max_num
      FROM quotations
      GROUP BY division
    `);
    console.log(JSON.stringify(res2.rows, null, 2));

    await client.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
