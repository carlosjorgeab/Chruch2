-- Migration: Create centro_custos table and link to transacoes
-- Date: 2026-07-12

CREATE TABLE IF NOT EXISTS centro_custos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  sigla VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE centro_custos DISABLE ROW LEVEL SECURITY;

-- Add id_centro_custo to transacoes table
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS id_centro_custo UUID REFERENCES centro_custos(id) ON DELETE SET NULL;
