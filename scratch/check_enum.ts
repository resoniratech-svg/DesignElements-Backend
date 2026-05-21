import pool from "../src/config/db";

async function main() {
  try {
    const { rows } = await pool.query("SELECT enum_range(NULL::approval_status)");
    console.log("Approval Status Enum:", rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
main();
