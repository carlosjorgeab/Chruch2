-- Migration: Update deputado and partidos tables
-- Remove is_default and add ativo to deputado table
ALTER TABLE deputado DROP COLUMN IF EXISTS is_default;
ALTER TABLE deputado ADD COLUMN ativo BOOLEAN DEFAULT true;

-- Increase nome limit in partidos table
-- Assuming it's a VARCHAR, we'll set it to a larger value (like 100) to be safe
ALTER TABLE partidos ALTER COLUMN nome TYPE VARCHAR(100);
