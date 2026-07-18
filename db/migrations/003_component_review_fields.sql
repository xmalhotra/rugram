ALTER TABLE routine_components ADD COLUMN IF NOT EXISTS reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE routine_components ADD COLUMN IF NOT EXISTS review_notes TEXT;
