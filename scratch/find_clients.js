const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trek_database_restore',
  password: 'Akanksha123',
  port: 5432,
});

async function checkClients() {
  try {
    const res = await pool.query("SELECT DISTINCT role FROM users");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkClients();
