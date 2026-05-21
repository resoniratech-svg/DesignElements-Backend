const { pool } = require('./src/config/db');

async function checkSchema() {
    try {
        console.log("Checking leads table...");
        const leads = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leads'");
        console.log("LEADS COLUMNS:", leads.rows);

        console.log("\nChecking lead_follow_ups table...");
        const followups = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lead_follow_ups'");
        console.log("FOLLOWUPS COLUMNS:", followups.rows);

        console.log("\nChecking clients table...");
        const clients = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clients'");
        console.log("CLIENTS COLUMNS:", clients.rows);

    } catch (err) {
        console.error("ERROR checking schema:", err);
    } finally {
        pool.end();
    }
}

checkSchema();
