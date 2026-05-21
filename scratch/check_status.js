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
    const result = await c.query('SELECT DISTINCT status FROM users');
    console.log(result.rows);
  })
  .catch(console.error)
  .finally(() => c.end());
