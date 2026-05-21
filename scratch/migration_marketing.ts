import { pool } from '../src/config/db';

async function runMigration() {
    try {
        console.log("Starting Lead Management Field Alignment...");
        
        // 1. Ensure columns exist and have correct names
        await pool.query(`
            DO $$ 
            BEGIN 
                -- Rename company_name to company if it exists
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='company_name') THEN
                    ALTER TABLE leads RENAME COLUMN company_name TO company;
                END IF;

                -- Rename contact_person to name if it exists
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='contact_person') THEN
                    ALTER TABLE leads RENAME COLUMN contact_person TO name;
                END IF;

                -- Add created_by if missing
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='created_by') THEN
                    ALTER TABLE leads ADD COLUMN created_by INTEGER;
                END IF;
            END $$;
        `);
        console.log("- Leads table columns aligned (name, company, created_by).");

    } catch (err) {
        console.error("Migration Error:", err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

runMigration();
