-- Migration: Adicionar campo municipio de volta a tabela orcamentos

ALTER TABLE orcamentos ADD COLUMN municipio VARCHAR(100);
