const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: '127.0.0.1', database: 'erp_backend_restored', password: 'root', port: 5433 });

async function run() {
    try {
        // Link existing invoices with NULL client_id to client_id 1
        const res = await pool.query("UPDATE invoices SET client_id = 1, total_amount = 4500, amount_paid = 1500, balance_amount = 3000, manager_id = NULL WHERE id IN (SELECT id FROM invoices WHERE client_id IS NULL LIMIT 10)");
        console.log('Updated invoices:', res.rowCount);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
