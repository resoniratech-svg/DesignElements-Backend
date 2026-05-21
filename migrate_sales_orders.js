const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' }); 

async function updateSchema() {
  try {
    await client.connect();
    
    // Add division column to sales_orders
    console.log("Adding division column...");
    await client.query("ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS division character varying(255);");
    
    // Update existing records to match the project manager's division for visibility in this session
    // We already know manager_id was set in the fix earlier.
    console.log("Updating existing sales_orders with division data...");
    await client.query(`
      UPDATE sales_orders so
      SET division = u.division
      FROM users u
      WHERE so.manager_id = u.id AND so.division IS NULL
    `);
    
    console.log("Sales orders migration completed successfully!");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

updateSchema();
