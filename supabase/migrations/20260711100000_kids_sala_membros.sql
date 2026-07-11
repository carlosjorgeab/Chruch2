-- Migration: Create kids_sala_membros table to link members/volunteers to specific rooms
-- Date: 2026-07-11

CREATE TABLE IF NOT EXISTS kids_sala_membros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_sala UUID REFERENCES kids_salas(id) ON DELETE CASCADE,
  id_membro UUID REFERENCES membros(id) ON DELETE CASCADE,
  cargo VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(id_sala, id_membro)
);

ALTER TABLE kids_sala_membros DISABLE ROW LEVEL SECURITY;
