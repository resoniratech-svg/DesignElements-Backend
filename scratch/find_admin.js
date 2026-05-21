const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' });
pool.query("SELECT u.email, u.password_plain, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name IN ('SUPER_ADMIN', 'ADMIN')", (err, res) => {
    if (err) {
        console.error(err);
    } else {
        console.table(res.rows);
    }
    pool.end();
});
