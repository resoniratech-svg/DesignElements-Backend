const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const pool = new Pool({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' });
(async () => {
    try {
        const hash = await bcrypt.hash('admin123', 10);
        await pool.query("UPDATE users SET password_hash = $1, password_plain = $2 WHERE email = $3", [hash, 'admin123', 'admin@erp.com']);
        console.log('Successfully reset admin password to admin123');
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
})();
