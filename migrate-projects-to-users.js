const { pool } = require('./dist/config/db');

async function migrate() {
    console.log("--- STARTING PROJECTS ALIGNMENT MIGRATION ---");
    try {
        // 1. Drop existing constraint
        console.log("1. Removing old 'clients' foreign key from projects...");
        await pool.query(`ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_client_id_fkey`);

        // 2. Clear old invalid data if any
        console.log("2. Nullifying old 'client_id' values that don't match the 'users' table...");
        await pool.query(`UPDATE projects SET client_id = NULL 
                         WHERE client_id IS NOT NULL 
                         AND NOT EXISTS (SELECT 1 FROM users WHERE users.id = projects.client_id)`);

        // 3. Add new constraint pointing to users(id)
        console.log("3. Linking 'projects.client_id' to 'users.id'...");
        await pool.query(`ALTER TABLE projects ADD CONSTRAINT projects_client_id_users_fkey 
                         FOREIGN KEY (client_id) REFERENCES users(id)`);

        console.log("4. Migration Success for Projects!");
        process.exit(0);
    } catch (err) {
        console.error("Migration Failed:", err.message);
        process.exit(1);
    }
}

migrate();
