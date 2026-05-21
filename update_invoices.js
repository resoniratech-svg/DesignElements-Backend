const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: '127.0.0.1', database: 'erp_backend_restored', password: 'root', port: 5433 });

async function run() {
    try {
        const res = await pool.query("UPDATE invoices SET client_id = 1, total_amount = 5000, amount_paid = 2000, balance_amount = 3000 WHERE id IN (SELECT id FROM invoices LIMIT 5)");
        console.log('Updated invoices:', res.rowCount);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
