-- Migration: Fix RLS policies for ministerios and acoes to properly allow INSERTS

-- Drop existing restricted policies if they exist (using the name from the previous migration)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON ministerios;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON acoes;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON ministerios;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON ministerios;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON ministerios;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON ministerios;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON acoes;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON acoes;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON acoes;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON acoes;

-- Disable RLS to match other tables that don't enforce Supabase Auth (since the system uses a custom `usuarios` table)
ALTER TABLE ministerios DISABLE ROW LEVEL SECURITY;
ALTER TABLE acoes DISABLE ROW LEVEL SECURITY;

