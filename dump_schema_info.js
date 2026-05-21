const { pool } = require('./src/config/db');

async function dumpSchema() {
  try {
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log("TABLES:", tables.rows.map(r => r.table_name).join(", "));
    
    for (const table of tables.rows) {
      const cols = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
      `, [table.table_name]);
      
      console.log(`\nTable: ${table.table_name}`);
      console.table(cols.rows);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

dumpSchema();
