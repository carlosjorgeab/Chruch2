-- Migration: Add system configurations and session tracking
-- Description: Creates table for system-wide settings and adds session tracking to users

-- Create system configurations table
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  descricao TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default configurations
INSERT INTO configuracoes_sistema (chave, valor, descricao)
VALUES 
  ('session_timeout', '30', 'Tempo de inatividade em minutos antes do logout automático'),
  ('disable_multi_login', 'false', 'Se verdadeiro, impede logins simultâneos da mesma conta'),
  ('theme_default', 'light', 'Tema padrão do sistema (light/dark)')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;

-- Update usuarios table for session tracking
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS current_session_id TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'light';

-- Add comment to explain current_session_id
COMMENT ON COLUMN usuarios.current_session_id IS 'Stored session ID to prevent multiple simultaneous logins if configured';
