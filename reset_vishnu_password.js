const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: '127.0.0.1', database: 'erp_backend_restored', password: 'root', port: 5433 });

async function run() {
    try {
        const hash = await bcrypt.hash('password123', 10);
        const res = await pool.query("UPDATE users SET password_hash = $1 WHERE email = 'vishnu@gmail.com'", [hash]);
        console.log('Password reset for vishnu@gmail.com. Rows affected:', res.rowCount);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
