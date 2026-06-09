-- Add slug to deputado table
ALTER TABLE deputado ADD COLUMN IF NOT EXISTS slug TEXT;

-- Generate initial slugs based on names
UPDATE deputado SET slug = LOWER(REGEXP_REPLACE(nome, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;

-- Make slug unique
ALTER TABLE deputado ADD CONSTRAINT deputado_slug_key UNIQUE (slug);
