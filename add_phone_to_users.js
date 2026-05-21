const { Client } = require('pg');
const client = new Client({ user: 'postgres', password: 'root', host: '127.0.0.1', port: 5433, database: 'erp_backend_restored' });
client.connect()
  .then(() => client.query("ALTER TABLE users ADD COLUMN phone VARCHAR(50);"))
  .then(() => { console.log('success'); return client.end(); })
  .catch(e => { console.log(e); return client.end(); });
