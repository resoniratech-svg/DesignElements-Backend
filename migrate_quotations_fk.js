const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'erp_backend_restored',
  password: 'root',
  port: 5433
});

async function run() {
  try {
    await client.connect();
    
    console.log("Starting migration to fix quotations.client_id foreign key...");

    // 1. Drop the old foreign key constraint
    // From my research, it's called 'fk_client'
    await client.query("ALTER TABLE quotations DROP CONSTRAINT IF EXISTS fk_client");
    console.log("Dropped old constraint fk_client (if it existed).");

    // 2. Add the new foreign key constraint pointing to users(id)
    await client.query(`
      ALTER TABLE quotations 
      ADD CONSTRAINT fk_quotations_user 
      FOREIGN KEY (client_id) 
      REFERENCES users(id) 
      ON DELETE CASCADE
    `);
    console.log("Added new constraint fk_quotations_user pointing to users(id).");

    await client.end();
    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("MIGRATION FAILED:", err.message);
    process.exit(1);
  }
}

run();
