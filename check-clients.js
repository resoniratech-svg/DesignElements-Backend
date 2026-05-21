const { pool } = require('./dist/config/db');
const fs = require('fs');

async function checkClients() {
  try {
    const res = await pool.query("SELECT id, name FROM clients LIMIT 10;");
    fs.writeFileSync('clients_list.txt', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    fs.writeFileSync('clients_list.txt', err.stack);
  }
  process.exit(0);
}

checkClients();
