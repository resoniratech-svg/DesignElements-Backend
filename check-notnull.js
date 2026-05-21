const { pool } = require('./dist/config/db');
const fs = require('fs');

async function checkNotNull() {
  try {
    const result = await pool.query(
      `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'projects';`
    );
    fs.writeFileSync('notnull-result.txt', JSON.stringify(result.rows, null, 2));
  } catch (err) {
    fs.writeFileSync('notnull-result.txt', err.stack);
  }
  process.exit(0);
}

checkNotNull();
