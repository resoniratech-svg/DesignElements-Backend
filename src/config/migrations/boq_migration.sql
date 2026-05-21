CREATE TABLE IF NOT EXISTS boqs (
    id SERIAL PRIMARY KEY,
    boq_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., BOQ-2026-001
    project_name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Unified: users table stores clients
    total_amount DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Under Process, Approved, Rejected
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS boq_items (
    id SERIAL PRIMARY KEY,
    boq_id INTEGER REFERENCES boqs(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(15, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    rate DECIMAL(15, 2) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
