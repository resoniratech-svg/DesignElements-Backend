const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5433/trek_database_d' }); 
client.connect().then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"))
.then(res => console.log(JSON.stringify(res.rows, null, 2)))
.catch(console.error)
.finally(()=>client.end());
