const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'erp_backend_restored',
  password: 'root',
  port: 5433
});

async function run() {
  try {
    await client.connect();
    
    // 1. Find a client
    const userRes = await client.query("SELECT id, name FROM users WHERE role = 'CLIENT' LIMIT 1");
    if (userRes.rows.length === 0) {
      console.error("No CLIENT users found in the database. Please create one first.");
      process.exit(1);
    }
    const testClientId = userRes.rows[0].id;
    console.log(`Using test client: ${userRes.rows[0].name} (ID: ${testClientId})`);

    // 2. Perform test insert with the new query logic
    const testPayload = {
      qtn_number: 'TEST-QUO-' + Math.floor(Math.random() * 1000),
      client_id: testClientId,
      division: 'contracting',
      total_amount: 1500,
      status: 'pending',
      items: [{ description: 'Test Item', quantity: 1, unitPrice: 1500, amount: 1500 }],
      valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      terms: 'Test Terms'
    };

    const query = `
      INSERT INTO quotations (
        qtn_number, 
        client_id, 
        division, 
        total_amount, 
        status, 
        items, 
        valid_until, 
        terms
      ) VALUES ($1, $2, $3::division_type, $4, $5::approval_status, $6::jsonb, $7, $8)
      RETURNING *
    `;

    const values = [
      testPayload.qtn_number,
      testPayload.client_id,
      testPayload.division,
      testPayload.total_amount,
      testPayload.status,
      testPayload.items,
      testPayload.valid_until,
      testPayload.terms
    ];

    const res = await client.query(query, values);
    console.log("SUCCESS: Quotation created successfully!");
    console.log(JSON.stringify(res.rows[0], null, 2));

    // 3. Clean up the test quotation
    await client.query("DELETE FROM quotations WHERE id = $1", [res.rows[0].id]);
    console.log("Cleanup: Test quotation deleted.");

    await client.end();
  } catch (err) {
    console.error("TEST FAILED:", err.message);
    process.exit(1);
  }
}

run();
