import { pool } from '../src/config/db';

async function diagnose() {
    try {
        console.log("DIAGNOSING LEAD SAVING ISSUE...");
        
        // 1. Check users
        const users = await pool.query('SELECT id, name, role FROM users');
        console.log("AVAILABLE USERS:", users.rows);

        // 2. Check Leads constraints
        const constraints = await pool.query(`
            SELECT conname, pg_get_constraintdef(c.oid) 
            FROM pg_constraint c 
            JOIN pg_namespace n ON n.oid = c.connamespace 
            WHERE nspname = 'public' 
            AND contype = 'f' 
            AND conrelid = 'leads'::regclass
        `);
        console.log("LEADS FOREIGN KEYS:", constraints.rows);

        // 3. Check for any NOT NULL constraints on leads
        const notNulls = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'leads' 
            AND is_nullable = 'NO' 
            AND column_default IS NULL 
            AND column_name != 'id'
        `);
        console.log("MANDATORY COLUMNS (NO DEFAULTS):", notNulls.rows);

    } catch (err) {
        console.error("Diagnosis Error:", err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

diagnose();
