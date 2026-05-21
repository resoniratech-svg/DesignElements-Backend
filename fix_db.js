const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' }); 

async function updateSchema() {
  try {
    await client.connect();
    
    // Add product_id
    await client.query("ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS product_id integer;");
    // Add quantity
    await client.query("ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS quantity numeric DEFAULT 0;");
    // Add unit_price
    await client.query("ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS unit_price numeric DEFAULT 0;");
    // Add manager_id
    await client.query("ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS manager_id integer;");
    // Add client (name)
    await client.query("ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS client character varying(255);");
    // Rename date to order_date in the backend if we use order_date or use date
    await client.query("ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS date date;");
    
    console.log("Schema updated successfully!");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

updateSchema();
