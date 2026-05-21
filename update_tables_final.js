const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
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
  // 1. Users
  await runSql("Update Users", `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS division division_enum;
  `);

  // 2. Clients
  await runSql("Update Clients", `
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='division') THEN
        UPDATE clients SET division = 'CONTRACTING' WHERE division NOT IN ('SERVICE', 'TRADING', 'CONTRACTING') OR division IS NULL;
        ALTER TABLE clients ALTER COLUMN division TYPE division_enum USING division::division_enum;
      ELSE
        ALTER TABLE clients ADD COLUMN division division_enum DEFAULT 'CONTRACTING';
      END IF;
    END $$;
  `);

  // 3. Invoices
  await runSql("Update Invoices", `
    DO $$ BEGIN
      -- division
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='division') THEN
        UPDATE invoices SET division = 'CONTRACTING' WHERE division NOT IN ('SERVICE', 'TRADING', 'CONTRACTING') OR division IS NULL;
        ALTER TABLE invoices ALTER COLUMN division TYPE division_enum USING division::division_enum;
      ELSE
        ALTER TABLE invoices ADD COLUMN division division_enum DEFAULT 'CONTRACTING';
      END IF;

      -- status
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='status') THEN
        UPDATE invoices SET status = 'DRAFT' WHERE status NOT IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED') OR status IS NULL;
        ALTER TABLE invoices ALTER COLUMN status TYPE approval_status_enum USING status::approval_status_enum;
      ELSE
        ALTER TABLE invoices ADD COLUMN status approval_status_enum DEFAULT 'DRAFT';
      END IF;

      -- unique constraint
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_invoice_division_number') THEN
        ALTER TABLE invoices ADD CONSTRAINT uq_invoice_division_number UNIQUE (division, invoice_number);
      END IF;
    END $$;
  `);

  // 4. Proposals
  await runSql("Update Proposals", `
    DO $$ BEGIN
      -- division
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposals' AND column_name='division') THEN
        ALTER TABLE proposals ADD COLUMN division division_enum DEFAULT 'CONTRACTING';
      END IF;

      -- status
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposals' AND column_name='status') THEN
        UPDATE proposals SET status = 'DRAFT' WHERE status NOT IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED') OR status IS NULL;
        ALTER TABLE proposals ALTER COLUMN status TYPE approval_status_enum USING status::approval_status_enum;
      ELSE
        ALTER TABLE proposals ADD COLUMN status approval_status_enum DEFAULT 'DRAFT';
      END IF;

      -- unique constraint
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_proposal_division_number') THEN
        ALTER TABLE proposals ADD CONSTRAINT uq_proposal_division_number UNIQUE (division, proposal_number);
      END IF;
    END $$;
  `);

  // 5. Internal Expenses
  await runSql("Update Internal Expenses", `
    DO $$ BEGIN
      -- division
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='internal_expenses' AND column_name='division') THEN
        ALTER TABLE internal_expenses ADD COLUMN division division_enum DEFAULT 'CONTRACTING';
      END IF;

      -- status
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='internal_expenses' AND column_name='status') THEN
        UPDATE internal_expenses SET status = 'DRAFT' WHERE status NOT IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED') OR status IS NULL;
        ALTER TABLE internal_expenses ALTER COLUMN status TYPE approval_status_enum USING status::approval_status_enum;
      ELSE
        ALTER TABLE internal_expenses ADD COLUMN status approval_status_enum DEFAULT 'DRAFT';
      END IF;
    END $$;
  `);

  // 6. Payments
  await runSql("Update Payments", `
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='division') THEN
          ALTER TABLE payments ADD COLUMN division division_enum DEFAULT 'CONTRACTING';
      END IF;
    END $$;
  `);

  process.exit(0);
}

run();
