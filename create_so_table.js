const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' });

client.connect().then(() => {
    return client.query(`
        CREATE TABLE IF NOT EXISTS sales_orders (
            id SERIAL PRIMARY KEY,
            client VARCHAR(255),
            client_id INTEGER,
            date DATE,
            status VARCHAR(50),
            total_amount NUMERIC(12,2),
            product_id INTEGER,
            quantity NUMERIC(10,2),
            unit_price NUMERIC(12,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
}).then(res => {
    console.log("Sales Orders table created successfully.");
    client.end();
}).catch(err => {
    console.error("Error creating table:", err.message);
    client.end();
});
