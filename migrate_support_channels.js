const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_channels (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        "desc" TEXT,
        icon VARCHAR(50),
        email VARCHAR(255),
        phone VARCHAR(50),
        color VARCHAR(50),
        sector VARCHAR(50) DEFAULT 'ALL',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created support_channels table successfully.");

    // Check if table is empty, if so, seed default channels
    const res = await pool.query(`SELECT COUNT(*) FROM support_channels`);
    if (parseInt(res.rows[0].count) === 0) {
      const defaultChannels = [
        ["Project Coordinator", "For technical queries, site progress, or schedule updates.", "Briefcase", "pm@trekgroup.com", "+974 1234 567", "blue", "SERVICE"],
        ["Trading Operations", "Queries regarding stock, delivery, or retail operations.", "Briefcase", "trading@trekgroup.com", "+974 1234 999", "blue", "TRADING"],
        ["Contracting Support", "Technical civil queries and site engineering updates.", "Briefcase", "civil@trekgroup.com", "+974 1234 888", "blue", "CONTRACTING"],
        ["Billing & Finance", "For invoice queries, payment status, or credit details.", "CreditCard", "finance@trekgroup.com", "+974 1234 5678", "emerald", "ALL"],
        ["General Support", "For portal access issues or feedback.", "HelpCircle", "support@trekgroup.com", "+974 1234 5678", "amber", "ALL"]
      ];

      for (const channel of defaultChannels) {
        await pool.query(`
          INSERT INTO support_channels (title, "desc", icon, email, phone, color, sector)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, channel);
      }
      console.log("Seeded default support channels.");
    }
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
migrate();
