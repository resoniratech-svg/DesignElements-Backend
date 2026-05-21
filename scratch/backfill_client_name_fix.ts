import pool from "../src/config/db";

async function main() {
  try {
    const { rowCount } = await pool.query(`
      UPDATE credit_requests cr
      SET client_name = COALESCE(c.contact_person, c.name)
      FROM clients c
      WHERE cr.client_id = c.id
    `);
    console.log(`Updated ${rowCount} existing credit requests with client names (contact_person priority).`);
  } catch (err) {
    console.error("Error updating client names:", err);
  } finally {
    pool.end();
  }
}
main();
