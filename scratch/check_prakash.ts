import pool from "../src/config/db";

async function main() {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email ILIKE '%prakash%'");
    console.log("Users found:", rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
main();
