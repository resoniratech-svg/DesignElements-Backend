-- migration_v3_brain.sql
-- 1. Ensure doc_counters structure
CREATE TABLE IF NOT EXISTS doc_counters (
    id SERIAL PRIMARY KEY,
    division VARCHAR(50) NOT NULL,
    doc_type VARCHAR(50) NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    year INTEGER,
    UNIQUE(division, doc_type)
);

-- 2. Add is_central boolean to internal_expenses
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='internal_expenses' AND column_name='is_central') THEN
        ALTER TABLE internal_expenses ADD COLUMN is_central BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 3. Initialize default counters for all divisions and types
INSERT INTO doc_counters (division, doc_type, last_number)
VALUES 
    ('SERVICE', 'INV', 0),
    ('TRADING', 'INV', 0),
    ('CONTRACTING', 'INV', 0),
    ('SERVICE', 'QUO', 0),
    ('TRADING', 'QUO', 0),
    ('CONTRACTING', 'QUO', 0)
ON CONFLICT (division, doc_type) DO NOTHING;
