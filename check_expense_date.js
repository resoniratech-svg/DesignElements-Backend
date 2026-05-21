const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@localhost:5433/trek_database_d'
});

async function run() {
  await client.connect();
  
  // Get columns and types of internal_expenses
  const colRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'internal_expenses';
  `);
  console.log('--- COLUMNS ---');
  colRes.rows.forEach(r => console.log(r.column_name, ':', r.data_type));

  const res = await client.query('SELECT id, date, created_at FROM internal_expenses ORDER BY created_at DESC LIMIT 5;');
  console.log('--- RAW VALUES ---');
  res.rows.forEach(r => {
    console.log(`id=${r.id}, date='${r.date}' (type=${typeof r.date}), created_at='${r.created_at}' (type=${typeof r.created_at})`);
  });
  
  await client.end();
}

run().catch(console.error);
