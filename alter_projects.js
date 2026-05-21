const { Client } = require('pg');

const client = new Client({ 
    user: 'postgres', 
    password: 'root', 
    host: '127.0.0.1', 
    port: 5433, 
    database: 'erp_backend_restored' 
});

async function runMigration() {
    try {
        await client.connect();
        console.log("Connected to DB.");

        await client.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS manager VARCHAR(255);');
        await client.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;');
        await client.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS division VARCHAR(100);');
        await client.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);');
        await client.query('ALTER TABLE projects ALTER COLUMN client_id DROP NOT NULL;');

        console.log("Migration successful!");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}

runMigration();
