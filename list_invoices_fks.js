const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: '127.0.0.1', database: 'erp_backend_restored', password: 'root', port: 5433 });

async function run() {
    try {
        const res = await pool.query(`
            SELECT tc.constraint_name, kcu.column_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
            WHERE tc.table_name='invoices' AND tc.constraint_type = 'FOREIGN KEY'
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
