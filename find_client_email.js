const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: '127.0.0.1', database: 'erp_backend_restored', password: 'root', port: 5433 });

async function run() {
    try {
        const res = await pool.query("SELECT email FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'CLIENT') LIMIT 1");
        console.log(res.rows[0]?.email);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
