import { pool } from "./config/db";
import bcrypt from "bcrypt";

const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log("🚀 Starting FINAL Comprehensive Database Initialization...");

    await client.query("BEGIN");

    console.log("🔥 DROPPING OBSOLETE INVENTORY TABLES...");
    await client.query("DROP TABLE IF EXISTS inventory_movements CASCADE");
    await client.query("DROP TABLE IF EXISTS sales_orders CASCADE");
    await client.query("DROP TABLE IF EXISTS purchase_orders CASCADE");
    await client.query("DROP TABLE IF EXISTS products CASCADE");

    // 0. Create ENUM types (if they don't exist)
    // Using DO block to avoid error if already exists
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'division_type') THEN
          CREATE TYPE division_type AS ENUM ('TRADING', 'CONTRACTING', 'ALL', 'GENERAL');
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
          CREATE TYPE approval_status AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'PAID', 'UNPAID', 'PARTIAL');
        END IF;
      END $$;
    `);

    // 1. Roles Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        password_plain VARCHAR(255),
        role_id INTEGER REFERENCES roles(id),
        role VARCHAR(50), -- Redundant role name for faster access
        division VARCHAR(50),
        sector VARCHAR(50),
        phone VARCHAR(20),
        address TEXT,
        qid VARCHAR(50),
        cr_number VARCHAR(50),
        computer_card VARCHAR(50),
        start_date DATE,
        renewal_date DATE,
        contract_type VARCHAR(50),
        company_name VARCHAR(100),
        qid_doc_url TEXT,
        cr_doc_url TEXT,
        computer_card_doc_url TEXT,
        contract_doc_url TEXT,
        client_id INTEGER,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure columns match expected ones if table already existed
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash') THEN
          ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
          -- Migrate if 'password' column existed
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password') THEN
            UPDATE users SET password_hash = password;
          END IF;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_plain') THEN
          ALTER TABLE users ADD COLUMN password_plain VARCHAR(255);
        END IF;
        -- Set password_hash to NOT NULL after migration
        ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
      END $$;
    `);

    // 3. Clients Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE,
        phone VARCHAR(20),
        address TEXT,
        contact_person VARCHAR(100),
        division VARCHAR(50),
        sector VARCHAR(50),
        client_code VARCHAR(20) UNIQUE,
        status VARCHAR(20) DEFAULT 'Active',
        credit_limit DECIMAL(15, 2) DEFAULT 0,
        user_id INTEGER REFERENCES users(id),
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Client Licenses
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_licenses (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id),
        license_name VARCHAR(100),
        license_type VARCHAR(50),
        license_number VARCHAR(50),
        expiry_date DATE,
        document_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Client Agreements
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_agreements (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id),
        title VARCHAR(255),
        file_url TEXT,
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Projects Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        project_name VARCHAR(255) NOT NULL,
        client_id INTEGER REFERENCES users(id),
        client_name VARCHAR(255),
        manager_id INTEGER REFERENCES users(id),
        manager VARCHAR(100),
        contract_value DECIMAL(15, 2) DEFAULT 0,
        start_date DATE,
        end_date DATE,
        description TEXT,
        division VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Active',
        uploaded_document TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Project Expenses
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_expenses (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id),
        description TEXT,
        amount DECIMAL(15, 2) NOT NULL,
        expense_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. BOQs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS boqs (
        id SERIAL PRIMARY KEY,
        boq_number VARCHAR(50) UNIQUE,
        project_name VARCHAR(255),
        client_name VARCHAR(255),
        client_id INTEGER REFERENCES clients(id),
        manager_id INTEGER REFERENCES users(id),
        division VARCHAR(50),
        status VARCHAR(50) DEFAULT 'DRAFT',
        subtotal DECIMAL(15, 2) DEFAULT 0,
        tax_percentage DECIMAL(5, 2) DEFAULT 0,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        discount DECIMAL(15, 2) DEFAULT 0,
        total_amount DECIMAL(15, 2) DEFAULT 0,
        items JSONB,
        title VARCHAR(255),
        sector VARCHAR(50),
        date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. BOQ Items
    await client.query(`
      CREATE TABLE IF NOT EXISTS boq_items (
        id SERIAL PRIMARY KEY,
        boq_id INTEGER REFERENCES boqs(id),
        description TEXT,
        unit VARCHAR(20),
        quantity DECIMAL(15, 2) DEFAULT 0,
        rate DECIMAL(15, 2) DEFAULT 0,
        amount DECIMAL(15, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. Invoices Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        division VARCHAR(50),
        client_id INTEGER REFERENCES users(id),
        client_name VARCHAR(255),
        project_name VARCHAR(255),
        invoice_date DATE,
        due_date DATE,
        date DATE,
        subtotal DECIMAL(15, 2) DEFAULT 0,
        tax_rate DECIMAL(5, 2) DEFAULT 0,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        discount DECIMAL(15, 2) DEFAULT 0,
        total_amount DECIMAL(15, 2) DEFAULT 0,
        amount_paid DECIMAL(15, 2) DEFAULT 0,
        balance_amount DECIMAL(15, 2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'UNPAID',
        approval_status VARCHAR(20) DEFAULT 'pending',
        lpo_no VARCHAR(50),
        salesman VARCHAR(100),
        qid VARCHAR(50),
        address TEXT,
        ref_type VARCHAR(50),
        reference_number VARCHAR(50),
        ref_no VARCHAR(50),
        notes TEXT,
        payment_terms TEXT,
        manager_id INTEGER REFERENCES users(id),
        contact_number VARCHAR(20),
        delivery_note VARCHAR(50),
        dn_date DATE,
        dn_prepared_by VARCHAR(100),
        dn_checked_by VARCHAR(100),
        dn_receiver_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. Invoice Items
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id),
        description TEXT,
        quantity DECIMAL(15, 2) DEFAULT 0,
        unit_price DECIMAL(15, 2) DEFAULT 0,
        total DECIMAL(15, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 12. Payments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id),
        payment_date DATE,
        amount DECIMAL(15, 2) NOT NULL,
        payment_method VARCHAR(50),
        reference_number VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 13. Internal Expenses Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS internal_expenses (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100),
        description TEXT,
        total_amount DECIMAL(15, 2) NOT NULL,
        date DATE,
        allocation_type VARCHAR(50),
        approval_status VARCHAR(50) DEFAULT 'PENDING_APPROVAL',
        vendor VARCHAR(255),
        payment_method VARCHAR(50),
        tax_rate DECIMAL(5, 2) DEFAULT 0,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        reference_id VARCHAR(50),
        attachment TEXT,
        notes TEXT,
        user_id INTEGER REFERENCES users(id),
        expense_type VARCHAR(50),
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 14. Expense Allocations
    await client.query(`
      CREATE TABLE IF NOT EXISTS expense_allocations (
        id SERIAL PRIMARY KEY,
        expense_id INTEGER REFERENCES internal_expenses(id),
        division VARCHAR(50),
        percentage DECIMAL(5, 2),
        amount DECIMAL(15, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 15. Leads Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        company VARCHAR(100),
        email VARCHAR(100),
        phone VARCHAR(20),
        status VARCHAR(50) DEFAULT 'New',
        division VARCHAR(50),
        source VARCHAR(100),
        notes TEXT,
        priority VARCHAR(20) DEFAULT 'Medium',
        assigned_to INTEGER REFERENCES users(id),
        created_by INTEGER REFERENCES users(id),
        reason_lost TEXT,
        next_follow_up_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 16. Lead Follow-ups
    await client.query(`
      CREATE TABLE IF NOT EXISTS lead_follow_ups (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id),
        user_id INTEGER REFERENCES users(id),
        note TEXT,
        next_follow_up_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);



    // 21. Credit Requests
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_requests (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id),
        client_name VARCHAR(255),
        amount DECIMAL(15, 2) NOT NULL,
        reason TEXT,
        notes TEXT,
        approval_status VARCHAR(20) DEFAULT 'pending',
        requested_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 22. Activity Logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        module VARCHAR(50),
        details JSONB,
        entity_id VARCHAR(50),
        entity_type VARCHAR(50),
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 23. Audit Logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(50),
        old_value JSONB,
        new_value JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 24. Notifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type VARCHAR(50),
        reference_id INTEGER,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 25. User Division Access
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_division_access (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        division VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, division)
      );
    `);

    // 26. Jobs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        assigned_to INTEGER REFERENCES users(id),
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 27. Proposals Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS proposals (
        id SERIAL PRIMARY KEY,
        proposal_number VARCHAR(50) UNIQUE NOT NULL,
        client_id INTEGER REFERENCES clients(id),
        project_title VARCHAR(255),
        proposal_date DATE DEFAULT CURRENT_DATE,
        valid_until DATE,
        status VARCHAR(50) DEFAULT 'DRAFT',
        total_amount DECIMAL(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 28. Proposal Items
    await client.query(`
      CREATE TABLE IF NOT EXISTS proposal_items (
        id SERIAL PRIMARY KEY,
        proposal_id INTEGER REFERENCES proposals(id),
        description TEXT,
        quantity DECIMAL(15,2) DEFAULT 0,
        unit_price DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 29. Employees Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(100),
        division VARCHAR(50),
        status VARCHAR(20) DEFAULT 'Active',
        company VARCHAR(100),
        joined_date DATE,
        qid_number VARCHAR(50),
        qid_expiry DATE,
        passport_number VARCHAR(50),
        passport_expiry DATE,
        email VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        documents JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 30. Quotations Table (With ENUM types)
    await client.query(`
      CREATE TABLE IF NOT EXISTS quotations (
        id SERIAL PRIMARY KEY,
        qtn_number VARCHAR(50) UNIQUE NOT NULL,
        client_id INTEGER REFERENCES users(id),
        division division_type DEFAULT 'CONTRACTING',
        total_amount DECIMAL(15, 2) DEFAULT 0,
        discount DECIMAL(15, 2) DEFAULT 0,
        status approval_status DEFAULT 'PENDING_APPROVAL',
        items JSONB DEFAULT '[]',
        valid_until TIMESTAMP,
        terms TEXT,
        project_name VARCHAR(255),
        client_name VARCHAR(255),
        attn VARCHAR(100),
        attn_designation VARCHAR(100),
        salutation VARCHAR(50),
        reference_no VARCHAR(100),
        intro_text TEXT,
        tc_terms TEXT,
        tc_payment TEXT,
        tc_delivery TEXT,
        tc_installation TEXT,
        tc_validity TEXT,
        outro_text TEXT,
        salesman VARCHAR(100),
        salesman_designation VARCHAR(100),
        salesman_phone VARCHAR(20),
        salesman_email VARCHAR(100),
        client_phone VARCHAR(20),
        client_email VARCHAR(100),
        selected_format VARCHAR(50) DEFAULT 'quotation1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 31. Role Permissions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        section_name VARCHAR(100) PRIMARY KEY,
        roles TEXT[] NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 32. Document Counters Table (for sequential document numbers)
    await client.query(`
      CREATE TABLE IF NOT EXISTS doc_counters (
        id SERIAL PRIMARY KEY,
        division VARCHAR(50) NOT NULL,
        doc_type VARCHAR(50) NOT NULL,
        last_number INTEGER NOT NULL DEFAULT 0,
        year INTEGER,
        UNIQUE(division, doc_type)
      );
    `);

    // ==========================================
    // SEEDING
    // ==========================================
    console.log("🌱 Seeding essential data...");

    // Seed Roles
    const roles = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS', 'PROJECT_MANAGER', 'CLIENT', 'MARKETING'];
    for (const roleName of roles) {
      await client.query(
        "INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
        [roleName]
      );
    }

    // Seed Default Permissions
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
      await client.query(
        `INSERT INTO role_permissions (section_name, roles) 
         VALUES ($1, $2) 
         ON CONFLICT (section_name) DO NOTHING`,
        [perm.section, perm.roles]
      );
    }

    // Seed Default Document Counters
    const defaultCounters = [
      { division: 'SERVICE', doc_type: 'INV', last_number: 0 },
      { division: 'TRADING', doc_type: 'INV', last_number: 0 },
      { division: 'CONTRACTING', doc_type: 'INV', last_number: 0 },
      { division: 'SERVICE', doc_type: 'QUO', last_number: 0 },
      { division: 'TRADING', doc_type: 'QUO', last_number: 0 },
      { division: 'CONTRACTING', doc_type: 'QUO', last_number: 0 }
    ];

    for (const counter of defaultCounters) {
      await client.query(
        `INSERT INTO doc_counters (division, doc_type, last_number) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (division, doc_type) DO NOTHING`,
        [counter.division, counter.doc_type, counter.last_number]
      );
    }

    // Seed Super Admin
    const superAdminRoleRes = await client.query("SELECT id FROM roles WHERE name = 'SUPER_ADMIN'");
    const roleId = superAdminRoleRes.rows[0].id;

    const email = "admin@erp.com";
    const userCheck = await client.query("SELECT id FROM users WHERE email = $1", [email]);

    if (userCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash("adminpassword123", 10);
      await client.query(
        `INSERT INTO users (name, email, password_hash, password_plain, role_id, role, division) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ["Super Admin", email, hashedPassword, "adminpassword123", roleId, "SUPER_ADMIN", "ALL"]
      );
      console.log("✅ Super Admin user created (admin@erp.com / adminpassword123)");
    } else {
      console.log("ℹ️ Super Admin user already exists.");
    }

    await client.query("COMMIT");
    console.log("✨ Database initialization complete!");

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Database initialization failed:", error);
  } finally {
    client.release();
    process.exit();
  }
};

initializeDatabase();
