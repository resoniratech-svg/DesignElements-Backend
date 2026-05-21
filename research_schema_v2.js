const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

async function getColumns(tableName) {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = $1 AND table_schema = 'public'
            ORDER BY ordinal_position
        `, [tableName]);
        
        if (res.rows.length === 0) {
            console.log(`\n--- ${tableName} (NOT FOUND) ---`);
            return;
        }
        
        console.log(`\n--- ${tableName} ---`);
        res.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type} (${row.is_nullable}) ${row.column_default || ''}`);
        });
    } catch (err) {
        console.error(`Error fetching columns for ${tableName}:`, err.message);
    }
}

async function run() {
    const tables = ['users', 'clients', 'invoices', 'proposals', 'expense', 'payments'];
    for (const table of tables) {
        await getColumns(table);
    }
    process.exit(0);
}

run();
