const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

async function createEnums() {
  try {
    // division_enum
    try {
      await pool.query("CREATE TYPE division_enum AS ENUM ('SERVICE', 'TRADING', 'CONTRACTING')");
      console.log('Created division_enum');
    } catch (e) {
      if (e.code === '42710') {
        console.log('division_enum already exists');
      } else {
        throw e;
      }
    }

    // approval_status_enum
    try {
      await pool.query("CREATE TYPE approval_status_enum AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')");
      console.log('Created approval_status_enum');
    } catch (e) {
      if (e.code === '42710') {
        console.log('approval_status_enum already exists');
      } else {
        throw e;
      }
    }

    console.log('Enum processing finished.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create enums:', err.message);
    process.exit(1);
  }
}

createEnums();
