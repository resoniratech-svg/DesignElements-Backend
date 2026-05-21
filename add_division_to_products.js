const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' });

client.connect().then(() => {
    return client.query("ALTER TABLE products ADD COLUMN division VARCHAR(50);");
}).then(res => {
    console.log("Column 'division' added to products table successfully.");
    client.end();
}).catch(err => {
    console.error("Error adding column:", err.message);
    client.end();
});
