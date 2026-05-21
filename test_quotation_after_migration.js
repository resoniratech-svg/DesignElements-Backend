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
    
    // Using user ID 32 (Accountant manager) which now exists in the referenced table 'users'
    const testClientId = 32; 
    console.log(`Using test user ID: ${testClientId}`);

    const qtn_number = 'FIX-TEST-' + Math.floor(Math.random() * 1000);

    const testPayload = {
      qtn_number: qtn_number,
      client_id: testClientId,
      division: 'CONTRACTING',
      total_amount: 1500.00,
      status: 'PENDING_APPROVAL',
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
      JSON.stringify(testPayload.items), 
      testPayload.valid_until,
      testPayload.terms
    ];

    console.log("Executing test INSERT after FK migration...");
    const res = await client.query(query, values);
    console.log("SUCCESS: Quotation created successfully!");
    console.log(JSON.stringify(res.rows[0], null, 2));

    // Cleanup
    await client.query("DELETE FROM quotations WHERE id = $1", [res.rows[0].id]);
    console.log("Cleanup: Test quotation deleted.");

    await client.end();
  } catch (err) {
    console.error("TEST FAILED:", err.message);
    if (err.detail) console.error("DETAIL:", err.detail);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

run();
