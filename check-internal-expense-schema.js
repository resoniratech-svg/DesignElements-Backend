const { pool } = require('./dist/config/db');
const fs = require('fs');

async function checkInternalExpenseSchema() {
  try {
    const result = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'internal_expenses';`
    );
    fs.writeFileSync('internal_expense_schema.txt', JSON.stringify(result.rows, null, 2));
  } catch (err) {
    fs.writeFileSync('internal_expense_schema.txt', err.stack);
  }
  process.exit(0);
}

checkInternalExpenseSchema();
