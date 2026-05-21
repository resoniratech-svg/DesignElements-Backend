const { Client } = require('pg');
const client = new Client({ user: 'postgres', password: 'root', host: '127.0.0.1', port: 5433, database: 'erp_backend_restored' });
client.connect()
  .then(() => client.query("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'Active', ADD COLUMN division VARCHAR(50), ADD COLUMN sector VARCHAR(50), ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))
  .then(() => { console.log('success'); return client.end(); })
  .catch(e => { console.log(e); return client.end(); });
