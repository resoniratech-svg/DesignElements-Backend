-- Multi-Division Structure Migration (Refined)

-- 1. Create Enums
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'division_type') THEN
        CREATE TYPE division_type AS ENUM ('SERVICE', 'TRADING', 'CONTRACTING');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status_type') THEN
        CREATE TYPE approval_status_type AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
    END IF;
END $$;

-- 2. Update Users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS division division_type;

-- 3. Update Clients table
DO $$ 
BEGIN
    -- Ensure existing data in 'division' matches the enum before converting
    UPDATE clients SET division = 'CONTRACTING' WHERE division IS NULL OR division NOT IN ('SERVICE', 'TRADING', 'CONTRACTING');
    
    -- Convert the column type
    ALTER TABLE clients ALTER COLUMN division TYPE division_type USING division::division_type;
EXCEPTION
    WHEN undefined_column THEN
        ALTER TABLE clients ADD COLUMN division division_type DEFAULT 'CONTRACTING';
END $$;

-- 4. Update Invoices table
DO $$ 
BEGIN
    -- Division
    UPDATE invoices SET division = 'CONTRACTING' WHERE division IS NULL OR division NOT IN ('SERVICE', 'TRADING', 'CONTRACTING');
    ALTER TABLE invoices ALTER COLUMN division TYPE division_type USING division::division_type;
    
    -- Status
    UPDATE invoices SET status = 'DRAFT' WHERE status IS NULL OR status NOT IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
    ALTER TABLE invoices ALTER COLUMN status TYPE approval_status_type USING status::approval_status_type;
    
    -- Composite Unique Constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_invoice_per_division') THEN
        ALTER TABLE invoices ADD CONSTRAINT unique_invoice_per_division UNIQUE (division, invoice_number);
    END IF;
END $$;

-- 5. Update Proposals (Quotations) table
DO $$ 
BEGIN
    -- Add division if missing
    ALTER TABLE proposals ADD COLUMN IF NOT EXISTS division division_type DEFAULT 'CONTRACTING';
    
    -- Update Status
    UPDATE proposals SET status = 'DRAFT' WHERE status IS NULL OR status NOT IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
    ALTER TABLE proposals ALTER COLUMN status TYPE approval_status_type USING status::approval_status_type;
    
    -- Composite Unique Constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_proposal_per_division') THEN
        ALTER TABLE proposals ADD CONSTRAINT unique_proposal_per_division UNIQUE (division, proposal_number);
    END IF;
END $$;

-- 6. Update Expense table
DO $$ 
BEGIN
    -- Add division if missing
    ALTER TABLE expense ADD COLUMN IF NOT EXISTS division division_type DEFAULT 'CONTRACTING';
    
    -- Update Status
    UPDATE expense SET status = 'DRAFT' WHERE status IS NULL OR status NOT IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
    ALTER TABLE expense ALTER COLUMN status TYPE approval_status_type USING status::approval_status_type;
END $$;

-- 7. Update Payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS division division_type DEFAULT 'CONTRACTING';
