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
    const result = await c.query('SELECT * FROM "Employee"');
    console.log(JSON.stringify(result.rows, null, 2));
  })
  .catch(console.error)
  .finally(() => c.end());
