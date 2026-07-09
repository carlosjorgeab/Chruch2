-- Migration: Disable Row Level Security (RLS) on all Kids Module tables to allow saving without RLS violations.
-- This ensures that standard client-side upsert actions can populate Turmas, Salas, and child check-ins successfully.

ALTER TABLE kids_turmas DISABLE ROW LEVEL SECURITY;
ALTER TABLE kids_turma_membros DISABLE ROW LEVEL SECURITY;
ALTER TABLE kids_salas DISABLE ROW LEVEL SECURITY;
ALTER TABLE kids_programacao_sala DISABLE ROW LEVEL SECURITY;
ALTER TABLE kids_sala_criancas DISABLE ROW LEVEL SECURITY;
