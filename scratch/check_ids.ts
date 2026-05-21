import pool from "../src/config/db";

async function main() {
  try {
    const { rows: users } = await pool.query("SELECT id, name, email, role FROM users LIMIT 3");
    console.log("Users:", users);

    const { rows: clients } = await pool.query("SELECT id, user_id, email FROM clients LIMIT 3");
    console.log("Clients:", clients);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
main();
