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
  try {
    const triggerRes = await pool.query(`
      SELECT 
        trigger_name, 
        event_manipulation, 
        action_statement,
        action_timing
      FROM information_schema.triggers 
      WHERE event_object_table = 'boq'
    `);
    console.log("Triggers on 'boq' table:");
    console.log(JSON.stringify(triggerRes.rows, null, 2));

    const colRes = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        column_default, 
        is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'boq' 
      ORDER BY ordinal_position
    `);
    console.log("\nColumns schema for 'boq' table:");
    console.log(JSON.stringify(colRes.rows, null, 2));

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
