const { Client } = require('pg');
const client = new Client({ user: 'postgres', password: 'root', host: '127.0.0.1', port: 5433, database: 'erp_backend_restored' });
(async () => {
  await client.connect();
  const res = await client.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_name IN ('invoices', 'clients')");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
})().catch(console.error);
