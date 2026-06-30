import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { pool } from "./config/db";
import { runGhostCleanup } from "./services/ghostCleanup";

// ==============================
// DB CONNECTION CHECK
// ==============================
pool.query("SELECT NOW()")
  .then(async (res) => {
    console.log("✅ [DB CONNECTION SUCCESS] Database Connected Successfully - Testing Auto Build");
    console.log("🚀 [TIMESTAMP]", new Date().toISOString());
    // Safe startup clean-up for legacy ghost accounts (prakash@gmail.com / madhu@gmail.com) on VPS redeployments
    await runGhostCleanup(pool);

    // Ensure role_permissions table exists in database
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        section_name VARCHAR(100) PRIMARY KEY,
        roles TEXT[] NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Ensure updated_at column is added to legacy databases
    await pool.query(`
      ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    // Ensure boqs table has all required columns
    try {
      await pool.query(`
        ALTER TABLE boqs ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
        ALTER TABLE boqs ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15, 2) DEFAULT 0;
        ALTER TABLE boqs ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5, 2) DEFAULT 0;
        ALTER TABLE boqs ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15, 2) DEFAULT 0;
        ALTER TABLE boqs ADD COLUMN IF NOT EXISTS discount DECIMAL(15, 2) DEFAULT 0;
        ALTER TABLE boqs ADD COLUMN IF NOT EXISTS items JSONB;
        ALTER TABLE boqs ADD COLUMN IF NOT EXISTS title VARCHAR(255);
        ALTER TABLE boqs ADD COLUMN IF NOT EXISTS sector VARCHAR(50);
        ALTER TABLE boqs ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
      `);
      console.log("🌱 [DB INFO] BOQs table columns verified/migrated successfully.");
    } catch (boqErr) {
      console.warn("⚠️ [DB WARNING] Failed to alter boqs table (it may not exist yet):", boqErr);
    }

    // Seed default permissions if table is empty
    const permCheck = await pool.query("SELECT COUNT(*) FROM role_permissions");
    if (Number(permCheck.rows[0].count) === 0) {
      const defaultPermissions = [
        { section: "Overview", roles: ["SUPER_ADMIN", "ACCOUNTS", "PROJECT_MANAGER"] },
        { section: "Client Management", roles: ["SUPER_ADMIN", "ACCOUNTS", "PROJECT_MANAGER"] },
        { section: "Projects", roles: ["SUPER_ADMIN", "PROJECT_MANAGER"] },
        { section: "Estimations", roles: ["SUPER_ADMIN", "ACCOUNTS", "PROJECT_MANAGER"] },
        { section: "Accounting", roles: ["SUPER_ADMIN", "ACCOUNTS", "PROJECT_MANAGER"] },
        { section: "Employee Management", roles: ["SUPER_ADMIN", "PROJECT_MANAGER", "ACCOUNTS"] },
        { section: "Reports", roles: ["SUPER_ADMIN", "ACCOUNTS"] },
        { section: "Marketing", roles: ["SUPER_ADMIN", "PROJECT_MANAGER", "ACCOUNTS"] },
        { section: "User Management", roles: ["SUPER_ADMIN"] }
      ];

      for (const perm of defaultPermissions) {
        await pool.query(
          `INSERT INTO role_permissions (section_name, roles) 
           VALUES ($1, $2) 
           ON CONFLICT (section_name) DO NOTHING`,
          [perm.section, perm.roles]
        );
      }
      console.log("🌱 [DB INFO] Default permissions seeded successfully.");
    }
  })
  .catch(err => console.error("❌ [DB ERROR]:", err));

// ==============================
// SERVER START
// ==============================
const PORT: number = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`🟢 [SERVER STARTED] Server running on port ${PORT}`);
  console.log(`📅 [STARTUP TIME] ${new Date().toISOString()}`);
});
