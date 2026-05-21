const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: Number(process.env.DB_PORT)
});
const check = async () => {
    try {
        const res = await pool.query("SELECT id, project_name, uploaded_document FROM projects LIMIT 1");
        console.log("SCHEMA_CHECK: Success. Columns exist.");
        console.log("SAMPLE_ROW:", res.rows[0]);
        process.exit(0);
    } catch (err) {
        console.error("SCHEMA_CHECK: Failed. " + err.message);
        process.exit(1);
    }
};
check();
