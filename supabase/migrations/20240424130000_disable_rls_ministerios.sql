-- Migration: Disable RLS for ministerios and acoes
-- This fixes the issue where the user cannot insert into these tables because they are not using Supabase Auth.
ALTER TABLE ministerios DISABLE ROW LEVEL SECURITY;
ALTER TABLE acoes DISABLE ROW LEVEL SECURITY;
