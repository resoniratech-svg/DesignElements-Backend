require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});
async function run() {
  try {
    const userRes = await pool.query("SELECT u.id, u.name, u.email, u.division, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.name ILIKE '%srinu%' OR u.email ILIKE '%srinu%'");
    console.log("--- Srinu User Data ---");
    console.log(JSON.stringify(userRes.rows, null, 2));

    const projectRes = await pool.query("SELECT id, project_name, manager, manager_id, division FROM projects");
    console.log("--- All Projects (Summary) ---");
    console.log(JSON.stringify(projectRes.rows, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
