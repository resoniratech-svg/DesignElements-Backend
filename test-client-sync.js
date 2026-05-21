const { pool } = require("./src/config/db");
const axios = require("axios");
require("dotenv").config();

async function testSync() {
  console.log("Testing user-to-client sync...");
  
  const testEmail = `test_sync_${Date.now()}@example.com`;
  
  try {
    // 1. Create a user via the API
    console.log(`Creating user with email: ${testEmail}`);
    const response = await axios.post("http://localhost:5000/api/users", {
      name: "Sync Tester",
      email: testEmail,
      password: "password123",
      phone: "12345678",
      role: "CLIENT",
      division: "SERVICE",
      company_name: "Sync Test Corp",
      address: "123 Test St",
      qid: "123",
      cr_number: "456",
      computer_card: "789"
    });

    console.log("API Response Status:", response.status);
    const userId = response.data.data.id;
    console.log("Created User ID:", userId);

    // 2. Check if a record exists in users table
    const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (userRes.rows.length > 0) {
      console.log("PASSED: User record found in 'users' table.");
    } else {
      console.log("FAILED: User record NOT found in 'users' table.");
    }

    // 3. Check if a record exists in clients table and is linked
    const clientRes = await pool.query("SELECT * FROM clients WHERE user_id = $1", [userId]);
    if (clientRes.rows.length > 0) {
      const client = clientRes.rows[0];
      console.log("PASSED: Client record found and linked to user ID.");
      console.log("Generated Client Code:", client.client_code);
      console.log("Client Name:", client.name);
    } else {
      console.log("FAILED: No client record found for this user ID.");
    }

    // Cleanup
    await pool.query("DELETE FROM clients WHERE user_id = $1", [userId]);
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    console.log("Cleanup completed.");

  } catch (err) {
    console.error("TEST FAILED:", err.response ? err.response.data : err.message);
  } finally {
    await pool.end();
  }
}

testSync();
