-- Migration: Add is_default to deputado table

ALTER TABLE deputado ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Set the first deputado as default if none exists
UPDATE deputado SET is_default = true WHERE id IN (
  SELECT id FROM deputado LIMIT 1
) AND NOT EXISTS (
  SELECT 1 FROM deputado WHERE is_default = true
);
