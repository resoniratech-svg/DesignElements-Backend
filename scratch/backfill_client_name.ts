import pool from "../src/config/db";

async function main() {
  try {
    const { rowCount } = await pool.query(`
      UPDATE credit_requests cr
      SET client_name = COALESCE(c.name, c.contact_person)
      FROM clients c
      WHERE cr.client_id = c.id AND cr.client_name IS NULL
    `);
    console.log(`Updated ${rowCount} existing credit requests with client names.`);
  } catch (err) {
    console.error("Error updating client names:", err);
  } finally {
    pool.end();
  }
}
main();
