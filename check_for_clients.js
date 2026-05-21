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
    
    // Check if 'clients' table exists
    const tableRes = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clients')");
    console.log(`Clients table exists: ${tableRes.rows[0].exists}`);

    if (tableRes.rows[0].exists) {
      const res = await client.query("SELECT id, name FROM clients LIMIT 1");
      console.log('--- CLIENTS ---');
      console.log(JSON.stringify(res.rows, null, 2));
    } else {
        console.log('--- USERS (fallback) ---');
        const res = await client.query("SELECT id, name FROM users LIMIT 1");
        console.log(JSON.stringify(res.rows, null, 2));
    }

    await client.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
