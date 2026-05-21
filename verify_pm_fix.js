const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'erp_backend_restored',
  password: 'root',
  port: 5433,
});

async function verifyFix() {
  try {
    console.log('--- Simulating Projects Fetch for Harish (ID 82, Role PM, Division TRADING) ---');
    
    // Simulating AccessGuard.getScopedWhere output for projects (p)
    // WHERE (p.manager_id = $1 OR UPPER(p.division) = UPPER($2))
    const params = [82, 'TRADING'];
    const query = `
      SELECT id, project_name, manager, manager_id, division 
      FROM projects p
      WHERE (p.manager_id = $1 OR UPPER(p.division) = UPPER($2))
      ORDER BY p.created_at DESC;
    `;
    
    const res = await pool.query(query, params);
    console.log('Results for Projects:', JSON.stringify(res.rows, null, 2));

    console.log('\n--- Simulating BOQs Fetch for Harish ---');
    // WHERE (b.manager_id = $1 OR UPPER(b.sector) = UPPER($2))
    const boqQuery = `
      SELECT id, project_name, manager_id, sector 
      FROM boqs b
      WHERE (b.manager_id = $1 OR UPPER(b.sector) = UPPER($2))
      ORDER BY b.created_at DESC;
    `;
    
    const boqRes = await pool.query(boqQuery, params);
    console.log('Results for BOQs:', JSON.stringify(boqRes.rows, null, 2));

  } catch (err) {
    console.error('VERIFICATION ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

verifyFix();
