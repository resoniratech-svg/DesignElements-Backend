const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'erp_backend_restored',
  password: 'root',
  port: 5433
});
pool.query(`
  ALTER TABLE internal_expenses 
  ADD COLUMN IF NOT EXISTS user_id UUID references users(id),
  ADD COLUMN IF NOT EXISTS expense_type VARCHAR(50);
`).then(() => console.log('OK')).catch(console.error).finally(()=>pool.end());
