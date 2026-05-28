import { Pool } from "pg";

/**
 * Automates the cleanup of legacy/ghost accounts (madhu@gmail.com, prakash@gmail.com)
 * from the database if they exist. This runs once on server startup.
 */
export async function runGhostCleanup(pool: Pool) {
  const emails = ['prakash@gmail.com', 'madhu@gmail.com'];
  const dbClient = await pool.connect();

  try {
    console.log("🔍 [STARTUP CLEANUP] Checking for ghost accounts...");

    for (const email of emails) {
      // Find the user ID
      const userRes = await dbClient.query("SELECT id, name FROM users WHERE email = $1", [email]);
      if (userRes.rows.length === 0) {
        continue;
      }

      const userId = userRes.rows[0].id;
      const userName = userRes.rows[0].name;
      console.log(`🧹 [STARTUP CLEANUP] Found ghost account for ${userName} (${email}) with User ID: ${userId}. Purging...`);

      await dbClient.query("BEGIN");

      // 1. Delete user_division_access references
      await dbClient.query("DELETE FROM user_division_access WHERE user_id = $1", [userId]);

      // 2. Delete audit_logs references
      await dbClient.query("DELETE FROM audit_logs WHERE user_id = $1", [userId]);

      // 3. Delete notifications references
      await dbClient.query("DELETE FROM notifications WHERE user_id = $1", [userId]);

      // 4. Update leads references
      await dbClient.query("UPDATE leads SET assigned_to = null WHERE assigned_to = $1", [userId]);

      // 5. Update projects/boqs/quotations/invoices references
      await dbClient.query("UPDATE projects SET client_id = null WHERE client_id = $1", [userId]);
      await dbClient.query("UPDATE projects SET manager_id = null WHERE manager_id = $1", [userId]);

      await dbClient.query("UPDATE boqs SET client_id = null WHERE client_id = $1", [userId]);
      await dbClient.query("UPDATE boqs SET manager_id = null WHERE manager_id = $1", [userId]);

      await dbClient.query("UPDATE quotations SET client_id = null WHERE client_id = $1", [userId]);

      await dbClient.query("UPDATE invoices SET client_id = null WHERE client_id = $1", [userId]);
      await dbClient.query("UPDATE invoices SET manager_id = null WHERE manager_id = $1", [userId]);

      await dbClient.query("UPDATE credit_requests SET requested_by = null WHERE requested_by = $1", [userId]);

      await dbClient.query("UPDATE jobs SET assigned_to = null WHERE assigned_to = $1", [userId]);

      // 6. Delete client profile references if any exist
      await dbClient.query("DELETE FROM client_licenses WHERE client_id IN (SELECT id FROM clients WHERE user_id = $1)", [userId]);
      await dbClient.query("DELETE FROM client_agreements WHERE client_id IN (SELECT id FROM clients WHERE user_id = $1)", [userId]);
      await dbClient.query("DELETE FROM clients WHERE user_id = $1", [userId]);

      // 7. Delete the user record itself
      await dbClient.query("DELETE FROM users WHERE id = $1", [userId]);

      await dbClient.query("COMMIT");
      console.log(`✅ [STARTUP CLEANUP] Successfully purged ghost user account: ${email}`);
    }

  } catch (err: any) {
    await dbClient.query("ROLLBACK");
    console.error("❌ [STARTUP CLEANUP ERROR] Cleanup process failed:", err.message);
  } finally {
    dbClient.release();
  }
}
