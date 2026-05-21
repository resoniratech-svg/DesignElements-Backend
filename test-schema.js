const { pool } = require('./dist/config/db');
const fs = require('fs');

async function testSchema() {
  try {
    const result = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'projects';`
    );
    fs.writeFileSync('schema-result.txt', JSON.stringify(result.rows, null, 2));
  } catch (err) {
    fs.writeFileSync('schema-result.txt', err.stack);
  }
  process.exit(0);
}

testSchema();
