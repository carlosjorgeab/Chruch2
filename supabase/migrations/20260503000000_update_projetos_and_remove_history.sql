-- Migration: Update projetos schema and remove historico_projetos
-- Description: Adds tramitacao and url_legislativo columns, drops municipio and valor_projeto columns, and drops historico_projetos table.

-- 1. Drop table historico_projetos
DROP TABLE IF EXISTS historico_projetos CASCADE;

-- 2. Modify table projetos
-- Add new columns
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS tramitacao TEXT DEFAULT 'Em elaboração';
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS url_legislativo TEXT;

-- Remove old columns
ALTER TABLE projetos DROP COLUMN IF EXISTS municipio;
ALTER TABLE projetos DROP COLUMN IF EXISTS valor_projeto;
