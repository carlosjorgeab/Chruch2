-- Add data column to projetos table
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS data DATE;

-- Update existing records to use created_at date as default for the new data column
UPDATE projetos SET data = DATE(created_at) WHERE data IS NULL;

-- Set a default for future records
ALTER TABLE projetos ALTER COLUMN data SET DEFAULT CURRENT_DATE;
