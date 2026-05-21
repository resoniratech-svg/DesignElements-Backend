-- Migration: Add manager_id to projects to enable Project-Level Isolation
-- Created: 2026-04-06

-- 1. Add manager_id column
ALTER TABLE projects ADD COLUMN manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- 2. Backfill existing projects (Best Effort)
-- Matches 'manager' (name string) to 'name' in users table
UPDATE projects p
SET manager_id = u.id
FROM users u
WHERE p.manager = u.name
AND p.manager_id IS NULL;

-- 3. Add Index for performance
CREATE INDEX idx_projects_manager_id ON projects(manager_id);

-- Optional: If you want to force all NEW projects to have it:
-- ALTER TABLE projects ALTER COLUMN manager_id SET NOT NULL; -- (Skipping to keep it optional)
