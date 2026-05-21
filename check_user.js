const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' }); 
client.connect().then(() => client.query("SELECT * FROM users LIMIT 1"))
.then(res => console.log(JSON.stringify(res.rows[0], null, 2)))
.catch(console.error)
.finally(()=>client.end());
