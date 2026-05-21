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
    const res = await client.query("SELECT id, name, role FROM users LIMIT 1");
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
