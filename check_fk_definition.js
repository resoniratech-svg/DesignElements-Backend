const { Pool } = require('pg');
const p = new Pool({
  user:'postgres',
  host:'127.0.0.1',
  database:'erp_backend_restored',
  password:'root',
  port:5433
});
p.query(`
SELECT conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE conname = 'expense_allocations_expense_id_fkey';
`).then(r => console.log(r.rows)).catch(console.error).finally(()=>p.end());
