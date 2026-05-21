import { pool } from "../db";
import bcrypt from "bcrypt";

const setup = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Create Enums
    await client.query(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'division_enum') THEN
              CREATE TYPE division_enum AS ENUM ('SERVICE', 'TRADING', 'CONTRACTING');
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status_type') THEN
              CREATE TYPE approval_status_type AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
          END IF;
      EXCEPTION
          WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // 2. ROLES
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const roles = ['SUPER_ADMIN', 'ADMIN', 'USER', 'ACCOUNTS', 'CLIENT', 'PM', 'MARKETING'];
    for (const role of roles) {
      await client.query(`INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [role]);
    }

    // 3. USERS
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        password_plain VARCHAR(255),
        phone VARCHAR(50),
        role_id INTEGER REFERENCES roles(id),
        sector VARCHAR(100),
        division VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Active',
        company_name VARCHAR(255),
        address TEXT,
        qid VARCHAR(100),
        cr_number VARCHAR(100),
        computer_card VARCHAR(100),
        start_date DATE,
        renewal_date DATE,
        contract_type VARCHAR(100),
        qid_doc_url TEXT,
        cr_doc_url TEXT,
        computer_card_doc_url TEXT,
        contract_doc_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. CLIENTS
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        contact_person VARCHAR(255),
        division VARCHAR(100),
        sector VARCHAR(100),
        client_code VARCHAR(100) UNIQUE,
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. EMPLOYEES
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(100),
        division VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Active',
        joined_date DATE,
        qid_number VARCHAR(50),
        qid_expiry DATE,
        passport_number VARCHAR(50),
        passport_expiry DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. SEED SUPER ADMIN
    const adminEmail = 'admin@erp.com';
    const adminPassword = 'adminpassword123'; // Change this after first login!
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const superAdminRole = await client.query(`SELECT id FROM roles WHERE name = 'SUPER_ADMIN'`);
    const roleId = superAdminRole.rows[0].id;

    await client.query(`
      INSERT INTO users (name, email, password_hash, password_plain, role_id, status, division)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO NOTHING
    `, ['Super Admin', adminEmail, hashedPassword, adminPassword, roleId, 'Active', 'CONTRACTING']);

    await client.query("COMMIT");
    console.log("Database initialized successfully with Super Admin!");
    console.log(`Login: ${adminEmail} / ${adminPassword}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Initialization Error:", err);
    throw err;
  } finally {
    client.release();
  }
};

setup().then(() => process.exit(0)).catch(() => process.exit(1));
