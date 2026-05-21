const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:root@127.0.0.1:5433/erp_backend_restored' });

async function main() {
  // Find the latest client
  const client = await pool.query('SELECT * FROM clients ORDER BY id DESC LIMIT 1');
  console.log("=== Latest Client ===");
  console.log(client.rows[0]);

  const clientId = client.rows[0].id;

  // Check licenses
  const licenses = await pool.query('SELECT * FROM client_licenses WHERE client_id = $1', [clientId]);
  console.log("\n=== Licenses ===");
  console.log(licenses.rows);

  // Check agreements
  const agreements = await pool.query('SELECT * FROM client_agreements WHERE client_id = $1', [clientId]);
  console.log("\n=== Agreements ===");
  console.log(agreements.rows);

  pool.end();
}
main();
