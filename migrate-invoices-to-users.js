const { pool } = require('./dist/config/db');

async function migrate() {
    console.log("--- STARTING PROPER ALIGNMENT MIGRATION ---");
    try {
        // 1. Drop existing constraint
        console.log("1. Removing old 'clients' foreign key...");
        await pool.query(`ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_client_id_fkey`);

        // 2. Clear old invalid data if any
        console.log("2. Nullifying old 'client_id' values that don't match the 'users' table...");
        await pool.query(`UPDATE invoices SET client_id = NULL 
                         WHERE client_id IS NOT NULL 
                         AND NOT EXISTS (SELECT 1 FROM users WHERE users.id = invoices.client_id)`);

        // 3. Add new constraint pointing to users(id)
        console.log("3. Linking 'invoices.client_id' to 'users.id'...");
        await pool.query(`ALTER TABLE invoices ADD CONSTRAINT invoices_client_id_users_fkey 
                         FOREIGN KEY (client_id) REFERENCES users(id)`);

        console.log("3. Migration Success!");
        process.exit(0);
    } catch (err) {
        console.error("Migration Failed:", err.message);
        process.exit(1);
    }
}

migrate();
