-- Migration: Add numero_proposicao to projetos
-- Description: Adds a new column 'numero_proposicao' (up to 15 characters) to the 'projetos' table to track proposition numbers.

ALTER TABLE projetos ADD COLUMN IF NOT EXISTS numero_proposicao VARCHAR(15);
