const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: '127.0.0.1', database: 'erp_backend_restored', password: 'root', port: 5433 });

async function run() {
    try {
        const res = await pool.query(`
            SELECT i.invoice_number, i.total_amount, u.email 
            FROM invoices i 
            JOIN users u ON i.client_id = u.client_id 
            WHERE u.email = 'vishnu@gmail.com'
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
