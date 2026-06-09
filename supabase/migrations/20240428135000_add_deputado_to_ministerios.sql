-- Migration: Add id_deputado to ministerios table
-- All ministries must be linked to a deputy
ALTER TABLE ministerios ADD COLUMN id_deputado UUID REFERENCES deputado(id);

-- Optional: If you want to force all NEW ministries to have a deputy, but skip existing ones for now
-- ALTER TABLE ministerios ALTER COLUMN id_deputado SET NOT NULL;
