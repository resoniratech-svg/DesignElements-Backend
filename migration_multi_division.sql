-- Multi-Division Structure Migration (Idempotent)

-- 1. Create Enums
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'division_enum') THEN
        CREATE TYPE division_enum AS ENUM ('SERVICE', 'TRADING', 'CONTRACTING');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status_enum') THEN
        CREATE TYPE approval_status_type AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Helper function to safely add column if not exists
DO $$ 
BEGIN
    -- users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='division') THEN
        ALTER TABLE users ADD COLUMN division division_enum;
    END IF;

    -- clients (convert existing)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='division') THEN
        UPDATE clients SET division = 'CONTRACTING' WHERE division NOT IN ('SERVICE', 'TRADING', 'CONTRACTING') OR division IS NULL;
        ALTER TABLE clients ALTER COLUMN division TYPE division_enum USING division::division_enum;
    ELSE
        ALTER TABLE clients ADD COLUMN division division_enum DEFAULT 'CONTRACTING';
    END IF;

    -- invoices (convert existing)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='division') THEN
        UPDATE invoices SET division = 'CONTRACTING' WHERE division NOT IN ('SERVICE', 'TRADING', 'CONTRACTING') OR division IS NULL;
        ALTER TABLE invoices ALTER COLUMN division TYPE division_enum USING division::division_enum;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='status') THEN
        UPDATE invoices SET status = 'DRAFT' WHERE status NOT IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED') OR status IS NULL;
        -- Note: If the column is already an enum of a different name, this might need more logic, but assuming it was text.
        ALTER TABLE invoices ALTER COLUMN status TYPE approval_status_type USING status::approval_status_type;
    END IF;

    -- Add unique constraint to invoices
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_invoice_division_number') THEN
        ALTER TABLE invoices ADD CONSTRAINT uq_invoice_division_number UNIQUE (division, invoice_number);
    END IF;

    -- proposals (Quotations)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposals' AND column_name='division') THEN
        ALTER TABLE proposals ADD COLUMN division division_enum DEFAULT 'CONTRACTING';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposals' AND column_name='status') THEN
        UPDATE proposals SET status = 'DRAFT' WHERE status NOT IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED') OR status IS NULL;
        ALTER TABLE proposals ALTER COLUMN status TYPE approval_status_type USING status::approval_status_type;
    END IF;

    -- Add unique constraint to proposals
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_proposal_division_number') THEN
        ALTER TABLE proposals ADD CONSTRAINT uq_proposal_division_number UNIQUE (division, proposal_number);
    END IF;

    -- internal_expenses (Expense)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='internal_expenses' AND column_name='division') THEN
        ALTER TABLE internal_expenses ADD COLUMN division division_enum DEFAULT 'CONTRACTING';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='internal_expenses' AND column_name='status') THEN
        ALTER TABLE internal_expenses ADD COLUMN status approval_status_type DEFAULT 'DRAFT';
    ELSE
        UPDATE internal_expenses SET status = 'DRAFT' WHERE status NOT IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED') OR status IS NULL;
        ALTER TABLE internal_expenses ALTER COLUMN status TYPE approval_status_type USING status::approval_status_type;
    END IF;

    -- payments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='division') THEN
        ALTER TABLE payments ADD COLUMN division division_enum DEFAULT 'CONTRACTING';
    END IF;

END $$;
