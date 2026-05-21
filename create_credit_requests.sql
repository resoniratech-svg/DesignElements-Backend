-- Migration: Create credit_requests table
CREATE TABLE IF NOT EXISTS credit_requests (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    approval_status VARCHAR(50) DEFAULT 'pending',
    requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_credit_requests_client_id ON credit_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_requests_status ON credit_requests(approval_status);
