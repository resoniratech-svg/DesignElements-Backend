require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

pool.query("ALTER TYPE user_role ADD VALUE 'CLIENT'")
  .then(res => {
     console.log('ALTER TYPE OK');
     process.exit(0);
  })
  .catch(e => {
     console.error(e.message);
     process.exit(1);
  });
