const { Pool } = require("pg");
require("dotenv").config();

async function checkConstraints() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log("Unique Indexes on 'clients' table:");
    const res = await pool.query(`
      SELECT
          t.relname as table_name,
          i.relname as index_name,
          a.attname as column_name
      FROM
          pg_class t,
          pg_class i,
          pg_index ix,
          pg_attribute a
      WHERE
          t.oid = ix.indrelid
          AND i.oid = ix.indexrelid
          AND a.attrelid = t.oid
          AND a.attnum = ANY(ix.indkey)
          AND t.relkind = 'r'
          AND ix.indisunique = true
          AND t.relname = 'clients'
    `);
    console.table(res.rows);

    console.log("\nNullable constraints (IS_NULLABLE) for 'clients' table:");
    const resNulls = await pool.query(`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'clients'
    `);
    console.table(resNulls.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkConstraints();
