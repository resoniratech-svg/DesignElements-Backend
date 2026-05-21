const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' }); 

async function migrate() {
  try {
    await client.connect();
    console.log("Starting employee table migration...");
    
    await client.query("ALTER TABLE employees ADD COLUMN IF NOT EXISTS email character varying(255)");
    await client.query("ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone character varying(50)");
    await client.query("ALTER TABLE employees ADD COLUMN IF NOT EXISTS address text");
    await client.query("ALTER TABLE employees ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb");
    
    console.log("Employee table migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

migrate();
