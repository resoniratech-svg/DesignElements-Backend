require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

async function run() {
  try {
    const userQuery = await pool.query("SELECT u.*, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = 'srinu@gmail.com'");
    const user = userQuery.rows[0];
    
    if (!user) {
      console.log("No user found");
      process.exit(1);
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        client_id: user.client_id,
        division: user.division
      },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );
    
    console.log("SRINU TOKEN GENERATED");

    const res = await axios.get("http://localhost:5000/api/projects", {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log("Projects for SRINU:", JSON.stringify(res.data.data.map(p => ({
      id: p.id, 
      name: p.project_name, 
      manager: p.manager, 
      manager_id: p.manager_id,
      division: p.division
    })), null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

run();
