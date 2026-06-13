-- =========================================================================
-- MIGRATION: 20260613141500_consolidate_supplier_and_payment_method_tables.sql
-- Descrição: Consolida tabelas duplicadas para usar exclusivamente 'fornecedor'
--            e 'forma_pagamento' (ambos singular). Resolve a redundância das
--            tabelas pluralizadas (fornecedores, formas_pagamento) migrando os
--            dados existentes antes de removê-las, e garante a integridade das
--            chaves estrangeiras (id_igreja) referenciando 'igrejas'.
-- Data: 2026-06-13
-- =========================================================================

-- 1. Certificar que as tabelas singularizadas existem com suas chaves estrangeiras adequadas
CREATE TABLE IF NOT EXISTS forma_pagamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS fornecedor (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
  razao_social VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(50),
  endereco TEXT,
  telefone VARCHAR(50),
  email VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Migrar dados e excluir as tabelas duplicadas redundantes
DO $$
BEGIN
  -- Migrar dados de fornecedores (plural) para fornecedor (singular) se ambas existirem
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fornecedores') AND
     EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fornecedor') THEN
     
     INSERT INTO fornecedor (id, id_igreja, razao_social, cpf_cnpj, endereco, telefone, email, created_at)
     SELECT id, id_igreja, razao_social, cpf_cnpj, endereco, telefone, email, created_at
     FROM fornecedores
     ON CONFLICT (id) DO NOTHING;
     
     DROP TABLE fornecedores CASCADE;
  ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fornecedores') THEN
     ALTER TABLE fornecedores RENAME TO fornecedor;
  END IF;

  -- Migrar dados de formas_pagamento (plural) para forma_pagamento (singular) se ambas existirem
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'formas_pagamento') AND
     EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'forma_pagamento') THEN
     
     INSERT INTO forma_pagamento (id, nome, id_igreja, created_at)
     SELECT id, nome, id_igreja, created_at
     FROM formas_pagamento
     ON CONFLICT (id) DO NOTHING;
     
     DROP TABLE formas_pagamento CASCADE;
  ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'formas_pagamento') THEN
     ALTER TABLE formas_pagamento RENAME TO forma_pagamento;
  END IF;
END $$;

-- 3. Garantir chaves estrangeiras (id_igreja) em todas as outras tabelas subordinadas
ALTER TABLE categorias 
  ADD COLUMN IF NOT EXISTS id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE;

ALTER TABLE contas 
  ADD COLUMN IF NOT EXISTS id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE;

ALTER TABLE forma_pagamento
  ADD COLUMN IF NOT EXISTS id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE;

ALTER TABLE fornecedor
  ADD COLUMN IF NOT EXISTS id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE;
