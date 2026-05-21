const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' });

async function performDelete() {
  const client = await pool.connect();
  try {
    const id = 59;
    await client.query("BEGIN");

    const clientRes = await client.query("SELECT id FROM clients WHERE user_id = $1", [id]);
    if (clientRes.rows.length > 0) {
      const clientId = clientRes.rows[0].id;
      await client.query("DELETE FROM client_licenses WHERE client_id = $1", [clientId]);
      await client.query("DELETE FROM client_agreements WHERE client_id = $1", [clientId]);
      await client.query("DELETE FROM clients WHERE id = $1", [clientId]);
    }

    await client.query("DELETE FROM notifications WHERE user_id = $1", [id]);
    await client.query("UPDATE projects SET manager_id = NULL WHERE manager_id = $1", [id]);
    await client.query("UPDATE projects SET client_id = NULL WHERE client_id = $1", [id]);
    await client.query("UPDATE invoices SET manager_id = NULL WHERE manager_id = $1", [id]);
    await client.query("UPDATE invoices SET client_id = NULL WHERE client_id = $1", [id]);
    await client.query("UPDATE activity_logs SET user_id = NULL WHERE user_id = $1", [id]);
    await client.query("UPDATE audit_logs SET user_id = NULL WHERE user_id = $1", [id]);
    await client.query("DELETE FROM users WHERE id = $1", [id]);

    await client.query("COMMIT");
    console.log("Deleted successfully");
    process.exit(0);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
  }
}

performDelete();
