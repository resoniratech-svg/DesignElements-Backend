require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

pool.query('SELECT table_name FROM information_schema.tables WHERE table_name = \'boqs\'')
  .then(res => {
     console.log('Tables found:', res.rows.map(r => r.table_name));
     process.exit(0);
  })
  .catch(e => {
     console.error(e);
     process.exit(1);
  });
