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

async function main() {
  try {
    const boqRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'boq' ORDER BY ordinal_position");
    const boqsRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'boqs' ORDER BY ordinal_position");
    const boqItemsRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'boq_items' ORDER BY ordinal_position");

    const schemas = {
      boq_singular: boqRes.rows,
      boqs_plural: boqsRes.rows,
      boq_items: boqItemsRes.rows
    };

    fs.writeFileSync('full_schema_audit.json', JSON.stringify(schemas, null, 2));
    console.log("Schema audit written to full_schema_audit.json");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
