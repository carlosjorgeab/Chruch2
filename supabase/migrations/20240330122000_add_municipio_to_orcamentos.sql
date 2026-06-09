-- Migration: Adicionar coluna municipio na tabela orcamentos

ALTER TABLE orcamentos ADD COLUMN municipio VARCHAR(100);
