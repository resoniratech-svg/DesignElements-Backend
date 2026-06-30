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

    // Ensure doc_counters table exists and is seeded
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS doc_counters (
          id SERIAL PRIMARY KEY,
          division VARCHAR(50) NOT NULL,
          doc_type VARCHAR(50) NOT NULL,
          last_number INTEGER NOT NULL DEFAULT 0,
          year INTEGER,
          UNIQUE(division, doc_type)
        );
      `);
      
      const defaultCounters = [
        { division: 'SERVICE', doc_type: 'INV', last_number: 0 },
        { division: 'TRADING', doc_type: 'INV', last_number: 0 },
        { division: 'CONTRACTING', doc_type: 'INV', last_number: 0 },
        { division: 'SERVICE', doc_type: 'QUO', last_number: 0 },
        { division: 'TRADING', doc_type: 'QUO', last_number: 0 },
        { division: 'CONTRACTING', doc_type: 'QUO', last_number: 0 }
      ];

      for (const counter of defaultCounters) {
        await pool.query(
          `INSERT INTO doc_counters (division, doc_type, last_number) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (division, doc_type) DO NOTHING`,
          [counter.division, counter.doc_type, counter.last_number]
        );
      }
      console.log("🌱 [DB INFO] doc_counters table verified/initialized successfully.");
    } catch (countErr) {
      console.error("❌ [DB ERROR] Failed to initialize doc_counters table:", countErr);
    }

    // Ensure invoices table has all required columns
    try {
      await pool.query(`
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) DEFAULT 'Standard';
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ref_no VARCHAR(100);
      `);
      console.log("🌱 [DB INFO] Invoices table columns verified/migrated successfully.");
    } catch (invErr) {
      console.warn("⚠️ [DB WARNING] Failed to alter invoices table:", invErr);
    }

    // Ensure projects table has all required columns
    try {
      await pool.query(`
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
      `);
      console.log("🌱 [DB INFO] Projects table columns verified/migrated successfully.");
    } catch (projErr) {
      console.warn("⚠️ [DB WARNING] Failed to alter projects table:", projErr);
    }

    // Ensure internal_expenses table has all required columns
    try {
      await pool.query(`
        ALTER TABLE internal_expenses ADD COLUMN IF NOT EXISTS is_central BOOLEAN DEFAULT FALSE;
      `);
      console.log("🌱 [DB INFO] internal_expenses table columns verified/migrated successfully.");
    } catch (expErr) {
      console.warn("⚠️ [DB WARNING] Failed to alter internal_expenses table:", expErr);
    }

    // Ensure users table has all required columns
    try {
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
      `);
      console.log("🌱 [DB INFO] Users table columns verified/migrated successfully.");
    } catch (userErr) {
      console.warn("⚠️ [DB WARNING] Failed to alter users table:", userErr);
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
