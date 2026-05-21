const { pool } = require('./src/config/db');

async function getColumns(tableName) {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = $1 
            ORDER BY ordinal_position
        `, [tableName]);
        console.log(`\n--- ${tableName} ---`);
        res.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type} (${row.is_nullable}) ${row.column_default || ''}`);
        });
    } catch (err) {
        console.error(`Error fetching columns for ${tableName}:`, err.message);
    }
}

async function run() {
    const tables = ['users', 'clients', 'invoices', 'proposals', 'expenses', 'expense', 'payments'];
    for (const table of tables) {
        await getColumns(table);
    }
    process.exit(0);
}

run();
