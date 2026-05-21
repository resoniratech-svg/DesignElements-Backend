const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' }); 
client.connect().then(() => client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
.then(res => console.log(JSON.stringify(res.rows, null, 2)))
.catch(console.error)
.finally(()=>client.end());
