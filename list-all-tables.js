const { pool } = require('./dist/config/db');
const fs = require('fs');

async function listAllTables() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    fs.writeFileSync('all_tables.txt', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    fs.writeFileSync('all_tables.txt', err.stack);
  }
  process.exit(0);
}

listAllTables();
