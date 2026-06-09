-- Migration: Atualizar projetos e criar historico_projetos

-- 1. Adicionar novos campos na tabela projetos
ALTER TABLE projetos ADD COLUMN ementa TEXT;
ALTER TABLE projetos ADD COLUMN tipo VARCHAR(100);
ALTER TABLE projetos ADD COLUMN autor VARCHAR(255);

-- 2. Criar tabela de historico_projetos
CREATE TABLE historico_projetos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_projeto UUID REFERENCES projetos(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  data DATE NOT NULL,
  valor NUMERIC(15, 2) NOT NULL DEFAULT 0
);
