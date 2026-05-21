const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: Number(process.env.DB_PORT),
});

async function runSql(name, sql) {
  try {
    console.log(`Running: ${name}...`);
    await pool.query(sql);
    console.log(`Success: ${name}`);
  } catch (err) {
    console.error(`Failed: ${name} - ${err.message}`);
  }
}

async function run() {
  await runSql("Create Enums", `
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'division_type') THEN
          CREATE TYPE division_type AS ENUM ('SERVICE', 'TRADING', 'CONTRACTING');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status_type') THEN
          CREATE TYPE approval_status_type AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
      END IF;
    END $$;
  `);

  await runSql("Update Users", "ALTER TABLE users ADD COLUMN IF NOT EXISTS division division_type;");

  await runSql("Update Clients", `
    DO $$ BEGIN
      UPDATE clients SET division = 'CONTRACTING' WHERE division IS NULL OR division NOT IN ('SERVICE', 'TRADING', 'CONTRACTING');
      ALTER TABLE clients ALTER COLUMN division TYPE division_type USING division::division_type;
    EXCEPTION WHEN undefined_column THEN
      ALTER TABLE clients ADD COLUMN division division_type DEFAULT 'CONTRACTING';
    END $$;
  `);

  await runSql("Update Invoices", `
    DO $$ BEGIN
      UPDATE invoices SET division = 'CONTRACTING' WHERE division IS NULL OR division NOT IN ('SERVICE', 'TRADING', 'CONTRACTING');
      ALTER TABLE invoices ALTER COLUMN division TYPE division_type USING division::division_type;
      
      UPDATE invoices SET status = 'DRAFT' WHERE status IS NULL OR status NOT IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
      
      -- Drop default before type change
      ALTER TABLE invoices ALTER COLUMN status DROP DEFAULT;
      ALTER TABLE invoices ALTER COLUMN status TYPE approval_status_type USING status::approval_status_type;
      ALTER TABLE invoices ALTER COLUMN status SET DEFAULT 'DRAFT'::approval_status_type;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_invoice_per_division') THEN
          ALTER TABLE invoices ADD CONSTRAINT unique_invoice_per_division UNIQUE (division, invoice_number);
      END IF;
    END $$;
  `);

  await runSql("Update Proposals", `
    DO $$ BEGIN
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS division division_type DEFAULT 'CONTRACTING';
      UPDATE proposals SET status = 'DRAFT' WHERE status IS NULL OR status NOT IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
      
      -- Drop default before type change
      ALTER TABLE proposals ALTER COLUMN status DROP DEFAULT;
      ALTER TABLE proposals ALTER COLUMN status TYPE approval_status_type USING status::approval_status_type;
      ALTER TABLE proposals ALTER COLUMN status SET DEFAULT 'DRAFT'::approval_status_type;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_proposal_per_division') THEN
          ALTER TABLE proposals ADD CONSTRAINT unique_proposal_per_division UNIQUE (division, proposal_number);
      END IF;
    END $$;
  `);

  await runSql("Update Expenses", `
    DO $$ BEGIN
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS division division_type DEFAULT 'CONTRACTING';
      UPDATE expenses SET status = 'DRAFT' WHERE status IS NULL OR status NOT IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
      
      -- Drop default before type change
      ALTER TABLE expenses ALTER COLUMN status DROP DEFAULT;
      ALTER TABLE expenses ALTER COLUMN status TYPE approval_status_type USING status::approval_status_type;
      ALTER TABLE expenses ALTER COLUMN status SET DEFAULT 'DRAFT'::approval_status_type;
    EXCEPTION WHEN undefined_column THEN
      ALTER TABLE expenses ADD COLUMN status approval_status_type DEFAULT 'DRAFT';
    END $$;
  `);

  await runSql("Update Payments", "ALTER TABLE payments ADD COLUMN IF NOT EXISTS division division_type DEFAULT 'CONTRACTING';");

  process.exit(0);
}

run();
