const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' });

async function performTestDelete() {
  const client = await pool.connect();
  try {
    const userId = 81;
    const clientId = 29;
    
    await client.query("BEGIN");

    // Cleanup Client
    await client.query("DELETE FROM client_licenses WHERE client_id = $1", [clientId]);
    await client.query("DELETE FROM client_agreements WHERE client_id = $1", [clientId]);
    await client.query("UPDATE sales_orders SET client_id = NULL WHERE client_id = $1", [clientId]);
    await client.query("DELETE FROM clients WHERE id = $1", [clientId]);

    // Cleanup User references
    await client.query("DELETE FROM notifications WHERE user_id = $1", [userId]);
    await client.query("UPDATE projects SET manager_id = NULL WHERE manager_id = $1", [userId]);
    await client.query("UPDATE projects SET client_id = NULL WHERE client_id = $1", [userId]);
    await client.query("UPDATE invoices SET manager_id = NULL WHERE manager_id = $1", [userId]);
    await client.query("UPDATE invoices SET client_id = NULL WHERE client_id = $1", [userId]);
    await client.query("UPDATE sales_orders SET manager_id = NULL WHERE manager_id = $1", [userId]);
    await client.query("UPDATE sales_orders SET client_id = NULL WHERE client_id = $1", [userId]);
    await client.query("UPDATE quotations SET client_id = NULL WHERE client_id = $1", [userId]);
    await client.query("UPDATE leads SET assigned_to = NULL WHERE assigned_to = $1", [userId]);
    await client.query("UPDATE leads SET created_by = NULL WHERE created_by = $1", [userId]);
    await client.query("UPDATE credit_requests SET requested_by = NULL WHERE requested_by = $1", [userId]);
    await client.query("UPDATE credit_requests SET client_id = NULL WHERE client_id = $1", [userId]);
    await client.query("UPDATE activity_logs SET user_id = NULL WHERE user_id = $1", [userId]);
    await client.query("UPDATE audit_logs SET user_id = NULL WHERE user_id = $1", [userId]);

    // Delete User
    await client.query("DELETE FROM users WHERE id = $1", [userId]);

    await client.query("COMMIT");
    console.log("Deleted user 81 successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to delete user 81:", err);
  } finally {
    client.release();
    pool.end();
  }
}

performTestDelete();
