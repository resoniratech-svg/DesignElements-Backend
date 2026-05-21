import pool from "../src/config/db";

async function main() {
  try {
    const tables = ['quotations', 'invoices', 'sales_orders', 'projects', 'leads', 'credit_requests'];
    
    for (const table of tables) {
      const { rows } = await pool.query(`
        SELECT column_name, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name IN ('client_id', 'manager_id', 'assigned_to', 'created_by', 'requested_by')
      `, [table]);
      console.log(`Table: ${table}`);
      console.log(rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
main();
