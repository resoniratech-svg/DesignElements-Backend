const { Client } = require('pg');
const c = new Client({ user: 'postgres', password: 'Akanksha123', host: 'localhost', database: 'trek_database_restore', port: 5432 });

async function run() {
  await c.connect();
  
  // Simulate dashboard queries for Bhanu (id=85) and Sathvika (id=89)
  for (const userId of [85, 89]) {
    console.log(`\n========== USER ID: ${userId} ==========`);
    
    const proj = await c.query("SELECT COUNT(*) as count FROM projects WHERE client_id = $1 AND LOWER(TRIM(status)) NOT IN ('cancelled', 'completed')", [userId]);
    console.log(`Active Projects: ${proj.rows[0].count}`);
    
    const boqs = await c.query("SELECT COUNT(*) as count FROM boqs WHERE client_id = $1", [userId]);
    console.log(`BOQs: ${boqs.rows[0].count}`);
    
    const qtns = await c.query("SELECT COUNT(*) as count FROM quotations WHERE client_id = $1", [userId]);
    console.log(`Quotations: ${qtns.rows[0].count}`);
    
    const billing = await c.query("SELECT COALESCE(SUM(balance_amount), 0) as pending FROM invoices WHERE client_id = $1 AND LOWER(TRIM(status)) != 'paid'", [userId]);
    console.log(`Pending Billing: QAR ${billing.rows[0].pending}`);
  }
  
  await c.end();
}
run().catch(e => { console.error(e.message); c.end(); });
