const { Client } = require('pg');
const client = new Client({ user: 'postgres', password: 'root', host: '127.0.0.1', port: 5433, database: 'erp_backend_restored' });
client.connect().then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")).then(res => { console.log(res.rows.map(r => r.column_name).join(', ')); client.end(); });
