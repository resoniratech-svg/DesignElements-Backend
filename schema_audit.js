require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

async function main() {
  const boqSchema = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'boq' ORDER BY ordinal_position");
  const boqsSchema = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'boqs' ORDER BY ordinal_position");
  
  console.log("--- TABLE: boq (singular) ---");
  console.log(JSON.stringify(boqSchema.rows, null, 2));
  
  console.log("\n--- TABLE: boqs (plural) ---");
  console.log(JSON.stringify(boqsSchema.rows, null, 2));
  
  await pool.end();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
