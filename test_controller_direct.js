require('dotenv').config();
const { Pool } = require('pg');
const { createBOQ } = require('./src/modules/boq/boq.controller');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

async function test() {
  const mockReq = {
    body: {
      boq_number: 'TEST-' + Date.now(),
      project_name: 'Terminal Test Project',
      client_name: 'Test Client',
      items: [
        { description: 'Item 1', quantity: 2, rate: 500, amount: 1000 }
      ]
    }
  };
  
  const mockRes = {
    status: function(s) { this.statusCode = s; return this; },
    json: function(j) { this.data = j; return this; }
  };

  console.log("Calling createBOQ...");
  await createBOQ(mockReq, mockRes);
  
  console.log("Response Status:", mockRes.statusCode);
  console.log("Response Data:", JSON.stringify(mockRes.data, null, 2));

  const check = await pool.query("SELECT * FROM boq WHERE project_name = 'Terminal Test Project' ORDER BY id DESC LIMIT 1");
  console.log("\nDatabase Record:");
  console.log(JSON.stringify(check.rows[0], null, 2));

  await pool.end();
}

test().catch(console.error);
