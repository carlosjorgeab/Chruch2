-- Migration: Revogar coluna uf e adicionar id_deputado na tabela projetos

-- Remover coluna uf da tabela projetos
ALTER TABLE projetos DROP COLUMN uf;

-- Remover coluna uf da tabela orcamentos
ALTER TABLE orcamentos DROP COLUMN uf;

-- Adicionar coluna id_deputado na tabela projetos
ALTER TABLE projetos ADD COLUMN id_deputado UUID REFERENCES deputado(id);
