const axios = require("axios");

async function manualTest() {
  try {
    const res = await axios.post("http://localhost:5000/api/users", {
      name: "Manual Sync Test",
      email: `manual_${Date.now()}@test.local`,
      password: "password123",
      role: "CLIENT",
      division: "SERVICE",
      company_name: "Manual Inc"
    });
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Error Status:", err.response?.status);
    console.error("Error Data:", JSON.stringify(err.response?.data, null, 2));
  }
}

manualTest();
