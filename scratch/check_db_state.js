const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' });

async function check() {
  try {
    const user = await pool.query('SELECT * FROM users WHERE id = 59');
    console.log('User 59:', user.rows[0]?.name || 'Not found');

    const client = await pool.query('SELECT * FROM clients WHERE user_id = 59');
    console.log('Client for 59:', client.rows[0]?.name || 'Not found');

    const notifs = await pool.query('SELECT count(*) FROM notifications WHERE user_id = 59');
    console.log('Notifications count for 59:', notifs.rows[0].count);

    const logs = await pool.query('SELECT count(*) FROM activity_logs WHERE user_id = 59');
    console.log('Logs count for 59:', logs.rows[0].count);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
