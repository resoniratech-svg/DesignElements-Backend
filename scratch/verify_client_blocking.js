const http = require('http');

function postJson(path, payload) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': dataString.length
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data
        });
      });
    });
    
    req.on('error', err => reject(err));
    req.write(dataString);
    req.end();
  });
}

async function verify() {
  console.log("=== VERIFYING CLIENT BLOCKING & ADMIN LOGIN ===");
  
  // 1. Try to login with CLIENT user
  console.log("\nAttempting CLIENT login (vishnu@gmail.com / 123456)...");
  try {
    const res = await postJson('/api/auth/login', {
      email: 'vishnu@gmail.com',
      password: '123456'
    });
    console.log("Status Code:", res.statusCode);
    console.log("Response Body:", res.body);
    const parsed = JSON.parse(res.body);
    if (res.statusCode === 403 && parsed.success === false && parsed.message.includes("Client login is disabled")) {
      console.log("✅ CLIENT LOGIN IS SUCCESSFULLY BLOCKED BY BACKEND!");
    } else {
      console.log("❌ CLIENT LOGIN BLOCK FAILED!");
    }
  } catch (err) {
    console.error("Error testing client login:", err);
  }

  // 2. Try to login with SUPER_ADMIN user
  console.log("\nAttempting ADMIN login (admin@erp.com / admin123)...");
  try {
    const res = await postJson('/api/auth/login', {
      email: 'admin@erp.com',
      password: 'admin123'
    });
    console.log("Status Code:", res.statusCode);
    console.log("Response Body:", res.body);
    const parsed = JSON.parse(res.body);
    if (res.statusCode === 200 && parsed.success === true && parsed.data.token) {
      console.log("✅ ADMIN LOGIN WORKS PERFECTLY!");
    } else {
      console.log("❌ ADMIN LOGIN FAILED!");
    }
  } catch (err) {
    console.error("Error testing admin login:", err);
  }
}

verify();
