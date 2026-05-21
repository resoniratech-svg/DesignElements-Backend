const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' }); 
client.connect().then(() => client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'employees'"))
.then(res => console.log(JSON.stringify(res.rows, null, 2)))
.catch(console.error)
.finally(()=>client.end());
