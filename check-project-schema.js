const { pool } = require('./dist/config/db');
const fs = require('fs');

async function checkProjectSchema() {
  try {
    const result = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'projects';`
    );
    fs.writeFileSync('project_schema.txt', JSON.stringify(result.rows, null, 2));
  } catch (err) {
    fs.writeFileSync('project_schema.txt', err.stack);
  }
  process.exit(0);
}

checkProjectSchema();
