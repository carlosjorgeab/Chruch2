-- Migration: Create auditoria table for system activity logs
CREATE TABLE IF NOT EXISTS auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nome VARCHAR(255),
  usuario_email VARCHAR(255),
  acao VARCHAR(100) NOT NULL,
  modulo VARCHAR(100) NOT NULL,
  detalhes TEXT NOT NULL,
  dados_anteriores JSONB DEFAULT NULL,
  dados_novos JSONB DEFAULT NULL,
  ip_address VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster querying
CREATE INDEX IF NOT EXISTS idx_auditoria_igreja ON auditoria(id_igreja);
CREATE INDEX IF NOT EXISTS idx_auditoria_created_at ON auditoria(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_modulo ON auditoria(modulo);

-- Disable RLS to allow seamless insertion and retrieval by admin roles
ALTER TABLE auditoria DISABLE ROW LEVEL SECURITY;
