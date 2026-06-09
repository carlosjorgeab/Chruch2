-- Migration: Add status to orcamentos and projetos and validate editais dates
ALTER TABLE orcamentos ADD COLUMN etapa TEXT DEFAULT 'Liberado' CHECK (etapa IN ('Rascunho', 'Liberado'));
ALTER TABLE projetos ADD COLUMN etapa TEXT DEFAULT 'Liberado' CHECK (etapa IN ('Rascunho', 'Liberado'));

-- Ensure existing records have 'Liberado' status
UPDATE orcamentos SET etapa = 'Liberado' WHERE etapa IS NULL;
UPDATE projetos SET etapa = 'Liberado' WHERE etapa IS NULL;
