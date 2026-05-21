const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' });

client.connect().then(() => {
    return client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products'");
}).then(res => {
    console.log(JSON.stringify(res.rows, null, 2));
    return client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'inventory_movements'");
}).then(res => {
    console.log("Movements:");
    console.log(JSON.stringify(res.rows, null, 2));
    client.end();
});
