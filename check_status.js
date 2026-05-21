const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'erp_backend_restored',
  password: 'root',
  port: 5433,
});

async function run() {
  try {
    const res = await pool.query("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'user_status';");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    if (err.message.includes('does not exist')) {
       // Maybe it's just a VARCHAR
       const colRes = await pool.query("SELECT DISTINCT status FROM users;");
       console.log("Distinct statuses:", JSON.stringify(colRes.rows));
    } else {
       console.error(err);
    }
  } finally {
    await pool.end();
  }
}

run();
