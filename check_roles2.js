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

pool.query("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'user_role'")
  .then(res => {
     fs.writeFileSync('roles.json', JSON.stringify(res.rows.map(r => r.enumlabel)));
     process.exit(0);
  })
  .catch(e => {
     console.error(e.message);
     process.exit(1);
  });
