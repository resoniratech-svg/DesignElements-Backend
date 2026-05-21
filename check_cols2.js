require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'")
  .then(res => {
     fs.writeFileSync('cols.json', JSON.stringify(res.rows, null, 2));
     process.exit(0);
  })
  .catch(e => {
     console.error(e.message);
     process.exit(1);
  });
