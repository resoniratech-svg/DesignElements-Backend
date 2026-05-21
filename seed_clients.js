const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

const dummyClients = [
  { name: 'Skyline Construction', email: 'contact@skyline.com', division: 'contracting' },
  { name: 'Global Traders Inc', email: 'info@globaltraders.com', division: 'trading' },
  { name: 'Tech Services Qatar', email: 'support@techservices.qa', division: 'service' },
  { name: 'Qatar Petroleum (Contract)', email: 'projects@qp.com.qa', division: 'contracting' },
  { name: 'Doha Trading Co', email: 'sales@dohatrading.com', division: 'trading' },
  { name: 'Facility Management Pro', email: 'ops@facilitypro.qa', division: 'service' },
];

async function seedClients() {
  try {
    for (const client of dummyClients) {
      await pool.query(
        "INSERT INTO users (name, email, role, password_hash, division) VALUES ($1, $2, 'CLIENT', 'password123', $3) ON CONFLICT (email) DO NOTHING",
        [client.name, client.email, client.division]
      );
      console.log(`Added client: ${client.name} (${client.division})`);
    }
    console.log("\nSeeding completed successfully.");
  } catch (e) {
    console.error("Error seeding clients:", e.message);
  }
  process.exit(0);
}

seedClients();
