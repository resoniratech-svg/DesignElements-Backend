const { Pool } = require('pg');
const p = new Pool({
  user:'postgres',
  host:'127.0.0.1',
  database:'erp_backend_restored',
  password:'root',
  port:5433
});
p.query(`
DELETE FROM expense_allocations WHERE expense_id NOT IN (SELECT id FROM internal_expenses);
ALTER TABLE expense_allocations DROP CONSTRAINT IF EXISTS expense_allocations_expense_id_fkey;
ALTER TABLE expense_allocations ADD CONSTRAINT expense_allocations_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES internal_expenses(id) ON DELETE CASCADE;
`).then(() => console.log('Successfully cleaned legacy allocations and fixed FK constraint')).catch(console.error).finally(()=>p.end());
