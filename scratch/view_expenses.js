require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

async function main() {
  try {
    const result = await pool.query(
      `SELECT e.*,
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
       ORDER BY e.created_at DESC`
    );
    console.log("Expenses data:");
    console.dir(result.rows, { depth: null });
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
