-- =========================================================================
-- MIGRATION: 20260613135500_ensure_church_foreign_keys.sql
-- Descrição: Garante a criação de chaves estrangeiras vinculadas à tabela 'igrejas'
--            em sub-tabelas recentemente adicionadas (categorias, contas, formas_pagamento, fornecedores)
-- Data: 2026-06-13
-- =========================================================================

-- 1. Tabela 'categorias'
ALTER TABLE categorias 
ADD COLUMN IF NOT EXISTS id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE;

-- 2. Tabela 'contas'
ALTER TABLE contas 
ADD COLUMN IF NOT EXISTS id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE;

-- 3. Tabela 'formas_pagamento' e alias 'forma_pagamento'
ALTER TABLE formas_pagamento 
ADD COLUMN IF NOT EXISTS id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE;

ALTER TABLE forma_pagamento 
ADD COLUMN IF NOT EXISTS id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE;

-- 4. Tabela 'fornecedores' e alias 'fornecedor'
ALTER TABLE fornecedores 
ADD COLUMN IF NOT EXISTS id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE;

ALTER TABLE fornecedor 
ADD COLUMN IF NOT EXISTS id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE;
