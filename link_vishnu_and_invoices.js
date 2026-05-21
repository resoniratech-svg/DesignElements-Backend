const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: '127.0.0.1', database: 'erp_backend_restored', password: 'root', port: 5433 });

async function run() {
    try {
        const res = await pool.query("SELECT id, name FROM clients LIMIT 1");
        const client = res.rows[0];
        if (client) {
            await pool.query("UPDATE users SET client_id = $1 WHERE email = 'vishnu@gmail.com'", [client.id]);
            // Also link some invoices to this client if they are null
            await pool.query("UPDATE invoices SET client_id = $1 WHERE client_id IS NULL LIMIT 5", [client.id]);
            console.log('Linked vishnu@gmail.com and 5 invoices to client:', client.name);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
