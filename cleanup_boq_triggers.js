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
  const triggersToDrop = [
    'trg_boq_total',
    'trg_boq_subtotal',
    'sync_boq_total',
    'update_boq_total',
    'recalculate_boq_total'
  ];

  console.log("Starting cleanup of old/inconsistent triggers on 'boq' table...");

  for (const trg of triggersToDrop) {
    try {
      await pool.query(`DROP TRIGGER IF EXISTS ${trg} ON boq`);
      console.log(`Successfully dropped trigger if it existed: ${trg}`);
    } catch (e) {
      console.error(`Error dropping trigger ${trg}: ${e.message}`);
    }
  }

  // Also dropping any trigger on 'boq_items' that tries to update 'boq'
  try {
    const res = await pool.query("SELECT tgname FROM pg_trigger JOIN pg_class ON tgrelid = pg_class.oid WHERE relname = 'boq_items'");
    for (const row of res.rows) {
      await pool.query(`DROP TRIGGER IF EXISTS ${row.tgname} ON boq_items`);
      console.log(`Successfully dropped trigger ${row.tgname} from boq_items`);
    }
  } catch (e) {
    console.log("No triggers found on boq_items table (or it doesn't exist).");
  }

  await pool.end();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
