-- Ensure data column exists and is populated for projetos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projetos' AND column_name='data') THEN
        ALTER TABLE projetos ADD COLUMN data DATE;
    END IF;
END $$;

-- Update remaining NULL values to current date if created_at fallback fails
UPDATE projetos SET data = CURRENT_DATE WHERE data IS NULL;

-- Set default for future records
ALTER TABLE projetos ALTER COLUMN data SET DEFAULT CURRENT_DATE;
