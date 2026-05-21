const { pool } = require('./dist/config/db');
const fs = require('fs');

async function checkJobs() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
    fs.writeFileSync('tables.txt', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    fs.writeFileSync('tables.txt', err.stack);
  }
  process.exit(0);
}

checkJobs();
