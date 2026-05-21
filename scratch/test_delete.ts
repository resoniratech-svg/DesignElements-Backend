import pool from "../src/config/db";

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const id = 86; // Prakash
    
    // 1. Delete associated client record (if exists)
    const clientRes = await client.query(`SELECT id FROM clients WHERE user_id = $1`, [id]);
    if (clientRes.rows.length > 0) {
      const clientId = clientRes.rows[0].id;
      await client.query(`DELETE FROM client_licenses WHERE client_id = $1`, [clientId]);
      await client.query(`DELETE FROM client_agreements WHERE client_id = $1`, [clientId]);
      await client.query(`UPDATE sales_orders SET client_id = NULL WHERE client_id = $1`, [clientId]);
      await client.query(`DELETE FROM clients WHERE id = $1`, [clientId]);
    }

    await client.query(`DELETE FROM notifications WHERE user_id = $1`, [id]);
    await client.query(`UPDATE projects SET manager_id = NULL WHERE manager_id = $1`, [id]);
    await client.query(`UPDATE projects SET client_id = NULL WHERE client_id = $1`, [id]);
    await client.query(`UPDATE invoices SET manager_id = NULL WHERE manager_id = $1`, [id]);
    await client.query(`UPDATE invoices SET client_id = NULL WHERE client_id = $1`, [id]);
    await client.query(`UPDATE sales_orders SET manager_id = NULL WHERE manager_id = $1`, [id]);
    await client.query(`UPDATE sales_orders SET client_id = NULL WHERE client_id = $1`, [id]);
    await client.query(`UPDATE quotations SET client_id = NULL WHERE client_id = $1`, [id]);
    await client.query(`UPDATE leads SET assigned_to = NULL WHERE assigned_to = $1`, [id]);
    await client.query(`UPDATE leads SET created_by = NULL WHERE created_by = $1`, [id]);
    await client.query(`UPDATE credit_requests SET requested_by = NULL WHERE requested_by = $1`, [id]);
    await client.query(`UPDATE credit_requests SET client_id = NULL WHERE client_id = $1`, [id]);
    await client.query(`UPDATE activity_logs SET user_id = NULL WHERE user_id = $1`, [id]);
    await client.query(`UPDATE audit_logs SET user_id = NULL WHERE user_id = $1`, [id]);

    await client.query(`DELETE FROM users WHERE id = $1`, [id]);

    console.log("Delete succeeded (rolling back for safety)");
    await client.query("ROLLBACK");
  } catch (err) {
    console.error("Delete failed with error:", err);
    await client.query("ROLLBACK");
  } finally {
    client.release();
    pool.end();
  }
}
main();
