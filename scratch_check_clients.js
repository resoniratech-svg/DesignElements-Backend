const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' });
pool.query('SELECT name, is_deleted FROM clients').then(res => console.log(res.rows)).catch(console.error).finally(() => pool.end());
