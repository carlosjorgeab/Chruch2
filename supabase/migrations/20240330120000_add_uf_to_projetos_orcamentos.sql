-- Migration: Adicionar coluna uf nas tabelas projetos e orcamentos

-- Adicionar coluna uf na tabela projetos
ALTER TABLE projetos ADD COLUMN uf VARCHAR(2);

-- Adicionar coluna uf na tabela orcamentos
ALTER TABLE orcamentos ADD COLUMN uf VARCHAR(2);
