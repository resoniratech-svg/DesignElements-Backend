const { pool } = require('./src/config/db');

async function runMigration() {
    try {
        console.log("Starting Lead Management Migration...");
        
        // 1. Alter Leads Table
        await pool.query(`
            ALTER TABLE leads 
            ADD COLUMN IF NOT EXISTS assigned_to INTEGER,
            ADD COLUMN IF NOT EXISTS division VARCHAR(50),
            ADD COLUMN IF NOT EXISTS source VARCHAR(50),
            ADD COLUMN IF NOT EXISTS reason_lost TEXT,
            ADD COLUMN IF NOT EXISTS next_follow_up_date DATE
        `);
        console.log("- Leads table updated.");

        // 2. Create Follow-ups Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS lead_follow_ups (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
                user_id INTEGER,
                note TEXT NOT NULL,
                date DATE DEFAULT CURRENT_DATE,
                next_follow_up_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("- lead_follow_ups table created.");

        // 3. Ensure Client Codes exist in clients
        const clientCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'clients'");
        const hasCode = clientCols.rows.some(r => r.column_name === 'client_code');
        if (!hasCode) {
            await pool.query("ALTER TABLE clients ADD COLUMN client_code VARCHAR(20) UNIQUE");
            console.log("- Added client_code to clients table.");
        }

    } catch (err) {
        console.error("Migration Error:", err);
    } finally {
        pool.end();
    }
}

runMigration();
