const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT e.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'division', ea.division,
                   'percentage', ea.percentage,
                   'amount', ea.amount
                 )
               ) FILTER (WHERE ea.id IS NOT NULL),
               '[]'
             ) as allocations
      FROM internal_expenses e
      LEFT JOIN expense_allocations ea ON ea.expense_id = e.id
      WHERE e.is_deleted = false
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
