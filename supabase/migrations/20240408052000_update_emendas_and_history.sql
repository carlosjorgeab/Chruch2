-- Migration: Alterar tabela orcamentos e criar historico_emendas

-- 1. Renomear campos na tabela orcamentos
ALTER TABLE orcamentos RENAME COLUMN descricao TO objeto;
ALTER TABLE orcamentos RENAME COLUMN municipio TO beneficiario;

-- 2. Adicionar campo autor
ALTER TABLE orcamentos ADD COLUMN autor VARCHAR(255);

-- 3. Criar tabela de historico_emendas
CREATE TABLE historico_emendas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_emenda UUID REFERENCES orcamentos(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  data DATE NOT NULL,
  valor NUMERIC(15, 2) NOT NULL DEFAULT 0
);
