const { pool } = require('./dist/config/db');
const fs = require('fs');

async function checkMissingTables() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('employees', 'leads', 'products', 'inventory_movements', 'sales_orders', 'jobs');
    `);
    fs.writeFileSync('existing_tables.txt', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    fs.writeFileSync('existing_tables.txt', err.stack);
  }
  process.exit(0);
}

checkMissingTables();
