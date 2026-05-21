const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: '127.0.0.1', database: 'erp_backend_restored', password: 'root', port: 5433 });

async function run() {
    try {
        const res = await pool.query(`
            INSERT INTO invoices 
            (invoice_number, client_id, total_amount, amount_paid, balance_amount, status, invoice_date, due_date, division) 
            VALUES 
            ('INV-TEST-001', 1, 10000, 4000, 6000, 'Pending', '2026-04-01', '2026-04-30', 'SERVICE')
        `);
        console.log('Created test invoice');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
