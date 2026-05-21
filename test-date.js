const { pool } = require('./dist/config/db');
const fs = require('fs');

async function testDate() {
  try {
    const result = await pool.query(
      `INSERT INTO projects
      (client_id, client_name, project_name, contract_value, start_date, end_date, manager, description, division, uploaded_document)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        null,
        'bhanu',
        'swethasaiphaniclinic',
        5000,
        '06-04-2026',
        '15-04-2026',
        'prakash',
        null,
        'service',
        null
      ]
    );
    fs.writeFileSync('date-result.txt', JSON.stringify(result.rows));
  } catch (err) {
    fs.writeFileSync('date-result.txt', err.stack);
  }
  process.exit(0);
}

testDate();
