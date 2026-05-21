const { Client } = require('pg');
const bcrypt = require('bcrypt');
const client = new Client({
  user: 'postgres',
  password: 'root',
  host: '127.0.0.1',
  port: 5433,
  database: 'erp_backend_restored'
});
async function run() {
  await client.connect();
  const hash = await bcrypt.hash('bhanu123', 10);
  await client.query("UPDATE users SET role = 'CLIENT', password_hash = $1 WHERE email = 'bhanu@gmail.com'", [hash]);
  await client.end();
  console.log('Bhanu updated to CLIENT with password bhanu123');
}
run().catch(console.error);
