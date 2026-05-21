const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: '127.0.0.1', database: 'erp_backend_restored', password: 'root', port: 5433 });

async function run() {
    try {
        const res = await pool.query(`
            SELECT tc.constraint_name, kcu.column_name, ccu.table_name as ref_table 
            FROM information_schema.table_constraints tc 
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name 
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name 
            WHERE tc.table_name = 'users' AND kcu.column_name = 'client_id'
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
