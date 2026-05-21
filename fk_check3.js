const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' });

async function main() {
  const result = await pool.query(`
    SELECT
      tc.table_name, kcu.column_name
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE ccu.table_name = 'invoices';
  `);
  console.log("All constraints referencing invoices:");
  console.log(result.rows);
  pool.end();
}
main();
