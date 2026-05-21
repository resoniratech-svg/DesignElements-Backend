-- migration_v4_audit_credit.sql
-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- e.g., 'STATUS_CHANGE', 'CREDIT_OVERRIDE'
    entity_type VARCHAR(100) NOT NULL, -- e.g., 'INVOICE', 'QUOTATION'
    entity_id INTEGER NOT NULL,
    old_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add credit_limit to clients
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='credit_limit') THEN
        ALTER TABLE clients ADD COLUMN credit_limit NUMERIC(15,2) DEFAULT 10000.00;
    END IF;
END $$;

-- 3. Ensure invoices and quotations have necessary status columns (already there but for safety)
-- Invoices: status (Paid, Unpaid, Partial), approval_status (approved, pending, rejected)
-- Quotations: status (PENDING_APPROVAL, APPROVED, REJECTED)
