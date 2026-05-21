const axios = require('axios');

async function test() {
  const baseURL = 'http://localhost:5000/api';
  
  // 1. Login to get token
  console.log("Logging in...");
  const loginRes = await axios.post(`${baseURL}/auth/login`, {
    email: 'admin@erp.com',
    password: 'Admin@123'
  });
  
  const token = loginRes.data.token;
  console.log("Token obtained.");

  // 2. Get All Clients
  console.log("Fetching /clients...");
  const clientsRes = await axios.get(`${baseURL}/clients`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Clients found:", clientsRes.data.data.length);

  // 3. Get first client details
  const firstClient = clientsRes.data.data[0];
  if (firstClient) {
    console.log(`Fetching detail for ID: ${firstClient.id} (${firstClient.name})...`);
    try {
      const detailRes = await axios.get(`${baseURL}/clients/${firstClient.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Detail response:", JSON.stringify(detailRes.data, null, 2));
    } catch (err) {
      console.error("Detail Fetch Error:", err.response?.status, err.response?.data);
    }
  }
}

test();
