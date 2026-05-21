const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'erp_backend_restored',
  password: 'root',
  port: 5433
});

async function run() {
  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT t.typname, e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname IN ('division_type', 'approval_status')
      ORDER BY t.typname, e.enumsortorder;
    `);
    
    const enums = {};
    res.rows.forEach(row => {
      if (!enums[row.typname]) enums[row.typname] = [];
      enums[row.typname].push(row.enumlabel);
    });
    
    console.log(JSON.stringify(enums, null, 2));

    await client.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
