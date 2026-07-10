-- Migration: Create kids_comunicados_anexos table to store attachments for kids_comunicados
-- Date: 2026-07-10

CREATE TABLE IF NOT EXISTS kids_comunicados_anexos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_comunicado UUID REFERENCES kids_comunicados(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE kids_comunicados_anexos DISABLE ROW LEVEL SECURITY;
