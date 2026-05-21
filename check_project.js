const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'erp_backend_restored',
  password: 'root',
  port: 5433,
});

async function checkProject() {
  try {
    const res = await pool.query("SELECT id, project_name, manager, manager_id, division FROM projects WHERE project_name ILIKE '%wellness co%';");
    console.log('Projects found:', JSON.stringify(res.rows, null, 2));
    
    const harishRes = await pool.query("SELECT id, name, role, division FROM users WHERE name ILIKE '%Harish%';");
    console.log('Harish details:', JSON.stringify(harishRes.rows, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkProject();
