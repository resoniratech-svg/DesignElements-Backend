require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

pool.query("INSERT INTO users (name, email, role, sector) VALUES ('vinay (Resonira Technologies)', 'vinay@test.com', 'CLIENT', 'service') ON CONFLICT DO NOTHING")
  .then(res => {
     console.log('Insert OK');
     process.exit(0);
  })
  .catch(e => {
     console.error(e.message);
     process.exit(1);
  });
