const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function testDelete() {
  const clientId = 32;
  const client = await pool.connect();
  try {
    console.log('Testing DELETE for Client ID:', clientId);
    await client.query("BEGIN");

    const clientRes = await client.query("SELECT user_id FROM clients WHERE id = $1", [clientId]);
    if (clientRes.rows.length === 0) {
      console.log('Client not found in DB');
      await client.query("ROLLBACK");
      return;
    }
    const userId = clientRes.rows[0].user_id;
    console.log('Associated User ID:', userId);

    console.log('Cleaning up sub-tables...');
    await client.query(`DELETE FROM client_licenses WHERE client_id = $1`, [clientId]);
    await client.query(`DELETE FROM client_agreements WHERE client_id = $1`, [clientId]);

    console.log('Nullifying client references...');
    await client.query(`UPDATE boqs SET client_id = NULL WHERE client_id = $1`, [clientId]);
    await client.query(`UPDATE projects SET client_id = NULL WHERE client_id = $1`, [clientId]);
    await client.query(`UPDATE invoices SET client_id = NULL WHERE client_id = $1`, [clientId]);
    await client.query(`UPDATE sales_orders SET client_id = NULL WHERE client_id = $1`, [clientId]);
    await client.query(`UPDATE quotations SET client_id = NULL WHERE client_id = $1`, [clientId]);
    await client.query(`UPDATE leads SET client_id = NULL WHERE client_id = $1`, [clientId]);
    await client.query(`UPDATE credit_requests SET client_id = NULL WHERE client_id = $1`, [clientId]);
    await client.query(`UPDATE proposals SET client_id = NULL WHERE client_id = $1`, [clientId]);
    await client.query(`UPDATE ledger_entries SET client_id = NULL WHERE client_id = $1`, [clientId]);
    
    // Check if these tables exist before updating
    try {
        await client.query(`UPDATE "ProServiceClient" SET client_id = NULL WHERE client_id = $1`, [clientId]);
    } catch (e) { console.log('ProServiceClient update failed:', e.message); }
    
    try {
        await client.query(`UPDATE "ProTask" SET client_id = NULL WHERE client_id = $1`, [clientId]);
    } catch (e) { console.log('ProTask update failed:', e.message); }
    
    await client.query(`UPDATE users SET client_id = NULL WHERE client_id = $1`, [clientId]);

    console.log('Deleting client...');
    await client.query("DELETE FROM clients WHERE id = $1", [clientId]);

    if (userId) {
      console.log('Cleaning up user references...');
      await client.query(`UPDATE projects SET manager_id = NULL WHERE manager_id = $1`, [userId]);
      await client.query(`UPDATE invoices SET manager_id = NULL WHERE manager_id = $1`, [userId]);
      await client.query(`UPDATE sales_orders SET manager_id = NULL WHERE manager_id = $1`, [userId]);
      await client.query(`UPDATE boqs SET manager_id = NULL WHERE manager_id = $1`, [userId]);
      await client.query(`UPDATE leads SET assigned_to = NULL WHERE assigned_to = $1`, [userId]);
      await client.query(`UPDATE leads SET created_by = NULL WHERE created_by = $1`, [userId]);
      await client.query(`UPDATE credit_requests SET requested_by = NULL WHERE requested_by = $1`, [userId]);
      await client.query(`UPDATE inventory_movements SET user_id = NULL WHERE user_id = $1`, [userId]);
      await client.query(`UPDATE activity_logs SET user_id = NULL WHERE user_id = $1`, [userId]);
      await client.query(`UPDATE audit_logs SET user_id = NULL WHERE user_id = $1`, [userId]);
      
      await client.query(`DELETE FROM notifications WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM user_division_access WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM lead_follow_ups WHERE user_id = $1`, [userId]);

      console.log('Deleting user...');
      await client.query("DELETE FROM users WHERE id = $1", [userId]);
    }

    console.log('Committing...');
    await client.query("COMMIT");
    console.log('SUCCESS');
  } catch (err) {
    console.error('ERROR DURING DELETE:', err.message);
    if (err.detail) console.log('DETAIL:', err.detail);
    await client.query("ROLLBACK");
  } finally {
    client.release();
    await pool.end();
  }
}

testDelete();
