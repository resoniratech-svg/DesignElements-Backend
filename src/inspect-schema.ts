import { pool } from "./config/db";

async function inspectSchema() {
  try {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("TABLES:", tables.rows.map(r => r.table_name));

    for (const table of tables.rows) {
      if (table.table_name === 'payments' || table.table_name === 'invoices' || table.table_name === 'quotations') {
        const columns = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table.table_name}'`);
        console.log(`COLUMNS FOR ${table.table_name}:`, columns.rows);
      }
    }
  } catch (err) {
    console.error("SCHEMA ERROR:", err);
  } finally {
    process.exit(0);
  }
}

inspectSchema();
