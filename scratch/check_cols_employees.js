const { Client } = require('pg');
const c = new Client({
  user: 'postgres',
  password: 'Akanksha123',
  host: 'localhost',
  port: 5432,
  database: 'trek_database_restore'
});

c.connect()
  .then(async () => {
    const cols = await c.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'employees' 
        ORDER BY ordinal_position
      `);
    console.log(cols.rows.map(r => r.column_name));
  })
  .catch(console.error)
  .finally(() => c.end());
