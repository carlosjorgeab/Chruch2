-- ==========================================================
-- Schema completo para Church Management
-- ==========================================================

-- Habilitar extensão de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Igrejas (Entity principal para Multi-Tenancy)
CREATE TABLE IF NOT EXISTS igrejas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20),
  endereco TEXT,
  telefone VARCHAR(20),
  email VARCHAR(100),
  logo_url TEXT,
  slug VARCHAR(100) UNIQUE,
  ativo BOOLEAN DEFAULT true,
  cor_fundo VARCHAR(50),
  cor_paineis VARCHAR(50),
  cor_bordas VARCHAR(50),
  cor_fontes VARCHAR(50),
  cor_botoes VARCHAR(50),
  idioma_padrao VARCHAR(10) DEFAULT 'pt',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Perfis de Usuários
CREATE TABLE IF NOT EXISTS perfis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  permissoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  id_perfil UUID REFERENCES perfis(id),
  id_igreja UUID REFERENCES igrejas(id),
  is_admin BOOLEAN DEFAULT false,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  current_session_id TEXT,
  theme_preference TEXT DEFAULT 'light',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON COLUMN usuarios.current_session_id IS 'Stored session ID to prevent multiple simultaneous logins se configured';

-- 4. Tabela de Membros
CREATE TABLE IF NOT EXISTS membros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  telefone VARCHAR(20),
  data_nascimento DATE,
  status VARCHAR(50) DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'Visitante')),
  batizado_aguas BOOLEAN DEFAULT false,
  batizado_espirito BOOLEAN DEFAULT false,
  cargo VARCHAR(50) DEFAULT 'Membro',
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Comunidades (Grupos / Células)
CREATE TABLE IF NOT EXISTS comunidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  dia_reuniao VARCHAR(20),
  horario VARCHAR(20),
  local TEXT,
  id_lider UUID REFERENCES membros(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Mural de Avisos
CREATE TABLE IF NOT EXISTS mural_avisos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  url_midia TEXT,
  arquivo_nome VARCHAR(255),
  arquivo_base64 TEXT,
  data_inicio DATE,
  data_fim DATE,
  status VARCHAR(20) DEFAULT 'Publicado' CHECK (status IN ('Publicado', 'Desativado')),
  notificar_automatico BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Lições (Aulas / Escola Dominical)
CREATE TABLE IF NOT EXISTS lecoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50) DEFAULT 'Estudo Bíblico', 
  referencia_biblica VARCHAR(100),
  data DATE,
  id_professor UUID REFERENCES membros(id),
  status VARCHAR(20) DEFAULT 'Programada' CHECK (status IN ('Programada', 'Completada', 'Cancelada')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela de Presenças 
CREATE TABLE IF NOT EXISTS presencas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
  id_lecao UUID REFERENCES lecoes(id),
  id_comunidade UUID REFERENCES comunidades(id),
  id_membro UUID REFERENCES membros(id),
  status_presenca VARCHAR(20) DEFAULT 'Presente' CHECK (status_presenca IN ('Presente', 'Falta')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(id_lecao, id_membro)
);

-- 8. Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  descricao TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabela de Transações Financeiras
CREATE TABLE IF NOT EXISTS transacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('Entrada', 'Saída')),
  categoria VARCHAR(50) NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(15, 2) NOT NULL,
  data DATE NOT NULL,
  membro_contribuinte VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================================
-- SEED DATA - DADOS INICIAIS DO SISTEMA
-- ==========================================================

-- Inserir Configurações do Sistema Padrão
INSERT INTO configuracoes_sistema (chave, valor, descricao)
VALUES 
  ('session_timeout', '30', 'Tempo de inatividade em minutos antes do logout automático'),
  ('disable_multi_login', 'false', 'Se verdadeiro, impede logins simultâneos da mesma conta'),
  ('theme_default', 'light', 'Tema padrão do sistema (light/dark)'),
  ('language_default', 'es', 'Idioma padrão do sistema')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;

-- Inserir Igreja Padrão
INSERT INTO igrejas (nome, slug, ativo)
VALUES ('Congregación Pentecostés', 'congregacion-pentecostes', true)
ON CONFLICT (slug) DO NOTHING;

-- Inserir Conta de Administrador Padrão
INSERT INTO usuarios (email, senha, is_admin, id_igreja)
VALUES (
  'admin@igreja.com',
  'admin123',
  true,
  (SELECT id FROM igrejas LIMIT 1)
)
ON CONFLICT (email) DO NOTHING;


-- ==========================================================
-- COMANDOS PARA ATUALIZAÇÃO DE BANCOS DE DADOS EXISTENTES (MIGRAÇÃO)
-- Execute estes comandos no Editor SQL do seu Supabase para habilitar novos recursos:
-- ==========================================================
-- ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS cor_fundo VARCHAR(50) DEFAULT '#f8fafc';
-- ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS cor_paineis VARCHAR(50) DEFAULT '#ffffff';
-- ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS cor_bordas VARCHAR(50) DEFAULT '#e2e8f0';
-- ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS cor_fontes VARCHAR(50) DEFAULT '#0f172a';
-- ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS cor_botoes VARCHAR(50) DEFAULT '#E4A232';
-- ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS idioma_padrao VARCHAR(10) DEFAULT 'pt';
-- ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

