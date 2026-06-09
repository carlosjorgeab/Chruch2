-- ==========================================================
-- Schema completo para Chruch Management (anteriormente Democracia Digital)
-- Este script consolida todas as migrações em uma única estrutura unificada.
-- ==========================================================

-- Habilitar extensão de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Partidos
CREATE TABLE IF NOT EXISTS partidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sigla VARCHAR(20) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  cor VARCHAR(20),
  text_color VARCHAR(20),
  border_color VARCHAR(20)
);

-- 2. Tabela de Deputados
CREATE TABLE IF NOT EXISTS deputado (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  id_partido UUID REFERENCES partidos(id),
  estado VARCHAR(2) NOT NULL,
  foto_url TEXT,
  slug VARCHAR(100) UNIQUE,
  ativo BOOLEAN DEFAULT true
);

-- 3. Tabela de Áreas Temáticas
CREATE TABLE IF NOT EXISTS areas_tematicas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  cor VARCHAR(20),
  icone_url TEXT
);

-- 4. Tabela de Projetos
CREATE TABLE IF NOT EXISTS projetos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  descricao TEXT NOT NULL,
  id_deputado UUID REFERENCES deputado(id),
  total_empenhado NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_executado NUMERIC(15, 2) NOT NULL DEFAULT 0,
  id_area_tematica UUID REFERENCES areas_tematicas(id),
  ementa TEXT,
  tipo VARCHAR(100),
  autor VARCHAR(255),
  tramitacao TEXT DEFAULT 'Em elaboração',
  url_legislativo TEXT,
  etapa TEXT DEFAULT 'Liberado' CHECK (etapa IN ('Rascunho', 'Liberado')),
  numero_proposicao VARCHAR(50),
  ano INTEGER,
  data_apresentacao DATE,
  link_proposicao TEXT
);

-- 5. Tabela de Orçamentos (Emendas)
CREATE TABLE IF NOT EXISTS orcamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_deputado UUID REFERENCES deputado(id),
  data DATE NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- Individuais (RP 6), De Bancada (RP 7), etc.
  objeto TEXT,
  valor NUMERIC(15, 2) NOT NULL,
  id_projeto UUID REFERENCES projetos(id),
  beneficiario VARCHAR(100),
  autor VARCHAR(255),
  municipio VARCHAR(100),
  data_inicial_edital DATE,
  data_final_edital DATE,
  area_tematica VARCHAR(100),
  etapa TEXT DEFAULT 'Liberado' CHECK (etapa IN ('Rascunho', 'Liberado'))
);

-- 6. Tabela de Histórico das Emendas
CREATE TABLE IF NOT EXISTS historico_emendas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_emenda UUID REFERENCES orcamentos(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  data DATE NOT NULL,
  valor NUMERIC(15, 2) NOT NULL DEFAULT 0
);

-- 7. Tabela de Unidade de Federação
CREATE TABLE IF NOT EXISTS unidade_federacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sigla VARCHAR(2) NOT NULL UNIQUE,
  nome VARCHAR(100) NOT NULL
);

-- 8. Tabela de Município
CREATE TABLE IF NOT EXISTS municipio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  id_uf UUID REFERENCES unidade_federacao(id),
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  populacao INTEGER
);

-- 9. Tabela de Perfis de Usuários
CREATE TABLE IF NOT EXISTS perfis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  permissoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  id_perfil UUID REFERENCES perfis(id),
  id_deputado UUID REFERENCES deputado(id),
  is_admin BOOLEAN DEFAULT false,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  current_session_id TEXT,
  theme_preference TEXT DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON COLUMN usuarios.current_session_id IS 'Stored session ID to prevent multiple simultaneous logins if configured';

-- 11. Tabela de Ministérios
CREATE TABLE IF NOT EXISTS ministerios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  endereco TEXT,
  nome_contato VARCHAR(255),
  telefone_contato VARCHAR(50),
  id_deputado UUID REFERENCES deputado(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Tabela de Ações
CREATE TABLE IF NOT EXISTS acoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_ministerio UUID REFERENCES ministerios(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Tabela de Editais
CREATE TABLE IF NOT EXISTS editais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_deputado UUID REFERENCES deputado(id),
  titulo TEXT NOT NULL,
  arquivo_pdf_base64 TEXT,
  data_inicio DATE,
  data_fim DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 14. Tabela de Formulários de Emendas / Submissões
CREATE TABLE IF NOT EXISTS formularios_emenda (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_entidade VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20) NOT NULL,
  nome_projeto VARCHAR(255) NOT NULL,
  resumo_projeto TEXT NOT NULL,
  descricao_projeto TEXT NOT NULL,
  orcamento_url TEXT,
  curriculo_url TEXT,
  id_ministerio UUID REFERENCES ministerios(id),
  id_acao UUID REFERENCES acoes(id),
  como_ficou_sabendo TEXT,
  concorda_regras BOOLEAN DEFAULT false,
  id_edital UUID REFERENCES editais(id),
  contato_nome TEXT,
  contato_telefone TEXT,
  contato_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  descricao TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Desativar RLS para tabelas auxiliares que operam livremente no painel administrativo
ALTER TABLE ministerios DISABLE ROW LEVEL SECURITY;
ALTER TABLE acoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE editais DISABLE ROW LEVEL SECURITY;
ALTER TABLE formularios_emenda DISABLE ROW LEVEL SECURITY;

-- ==========================================================
-- SEED DATA - DADOS INICIAIS DO SISTEMA
-- ==========================================================

-- Inserir Configurações do Sistema Padrão
INSERT INTO configuracoes_sistema (chave, valor, descricao)
VALUES 
  ('session_timeout', '30', 'Tempo de inatividade em minutos antes do logout automático'),
  ('disable_multi_login', 'false', 'Se verdadeiro, impede logins simultâneos da mesma conta'),
  ('theme_default', 'light', 'Tema padrão do sistema (light/dark)')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;

-- Inserir UFs do Brasil
INSERT INTO unidade_federacao (sigla, nome) VALUES
('AC', 'Acre'), ('AL', 'Alagoas'), ('AP', 'Amapá'), ('AM', 'Amazonas'),
('BA', 'Bahia'), ('CE', 'Ceará'), ('DF', 'Distrito Federal'), ('ES', 'Espírito Santo'),
('GO', 'Goiás'), ('MA', 'Maranhão'), ('MT', 'Mato Grosso'), ('MS', 'Mato Grosso do Sul'),
('MG', 'Minas Gerais'), ('PA', 'Pará'), ('PB', 'Paraíba'), ('PR', 'Paraná'),
('PE', 'Pernambuco'), ('PI', 'Piauí'), ('RJ', 'Rio de Janeiro'), ('RN', 'Rio Grande do Norte'),
('RS', 'Rio Grande do Sul'), ('RO', 'Rondônia'), ('RR', 'Roraima'), ('SC', 'Santa Catarina'),
('SP', 'São Paulo'), ('SE', 'Sergipe'), ('TO', 'Tocantins')
ON CONFLICT (sigla) DO NOTHING;

-- Inserir Municípios de Exemplo
INSERT INTO municipio (nome, id_uf, latitude, longitude, populacao) VALUES
('São Paulo', (SELECT id FROM unidade_federacao WHERE sigla = 'SP'), -23.5505, -46.6333, 12325232),
('Rio de Janeiro', (SELECT id FROM unidade_federacao WHERE sigla = 'RJ'), -22.9068, -43.1729, 6747815),
('Brasília', (SELECT id FROM unidade_federacao WHERE sigla = 'DF'), -15.7942, -47.8822, 3055149),
('Salvador', (SELECT id FROM unidade_federacao WHERE sigla = 'BA'), -12.9714, -38.5014, 2886698),
('Fortaleza', (SELECT id FROM unidade_federacao WHERE sigla = 'CE'), -3.7172, -38.5433, 2686612),
('Belo Horizonte', (SELECT id FROM unidade_federacao WHERE sigla = 'MG'), -19.9167, -43.9345, 2521564),
('Manaus', (SELECT id FROM unidade_federacao WHERE sigla = 'AM'), -3.1190, -60.0217, 2219580),
('Curitiba', (SELECT id FROM unidade_federacao WHERE sigla = 'PR'), -25.4284, -49.2733, 1948626),
('Recife', (SELECT id FROM unidade_federacao WHERE sigla = 'PE'), -8.0476, -34.8770, 1653461),
('Goiânia', (SELECT id FROM unidade_federacao WHERE sigla = 'GO'), -16.6869, -49.2648, 1536097);

-- Inserir Partidos e Cores Padrão
INSERT INTO partidos (sigla, nome, cor, text_color, border_color) VALUES
('PT', 'Partido dos Trabalhadores', '#cc0000', '#ffffff', '#cc0000'),
('PL', 'Partido Liberal', '#2452a8', '#ffffff', '#2452a8'),
('UNIÃO', 'União Brasil', '#002f6c', '#ffffff', '#002f6c'),
('PSD', 'Partido Social Democrático', '#ffd000', '#000000', '#ffd000'),
('MDB', 'Movimento Democrático Brasileiro', '#00853b', '#ffffff', '#00853b'),
('PP', 'Progressistas', '#003399', '#ffffff', '#003399'),
('REPUBLICANOS', 'Republicanos', '#104a8e', '#ffffff', '#104a8e'),
('PODE', 'Podemos', '#009ccc', '#ffffff', '#009ccc'),
('PDT', 'Partido Democrático Trabalhista', '#ff0000', '#ffffff', '#ff0000'),
('PSDB', 'Partido da Social Democracia Brasileira', '#005ca9', '#ffcc00', '#ffffff');

-- Inserir Deputado Padrão
INSERT INTO deputado (nome, id_partido, estado, foto_url, slug, ativo)
VALUES (
  'Carlos Silva',
  (SELECT id FROM partidos WHERE sigla = 'PT' LIMIT 1),
  'SP',
  'https://picsum.photos/seed/deputado/200/200',
  'carlos-silva',
  true
);

-- Inserir Áreas Temáticas Padrão
INSERT INTO areas_tematicas (nome, cor, icone_url) VALUES 
('Saúde', '#ef4444', 'Heart'), 
('Educação', '#f59e0b', 'GraduationCap'), 
('Esporte', '#10b981', 'Activity'), 
('Segurança Pública', '#3b82f6', 'ShieldAlert'), 
('Infraestrutura', '#6b7280', 'HardHat'), 
('Cultura', '#8b5cf6', 'Music'), 
('Assistência Social', '#ec4899', 'Users');

-- Inserir Conta de Administrador Padrão
-- Senha padrão codificada: Cjl@j2326082110
INSERT INTO usuarios (email, senha, is_admin, id_deputado)
VALUES (
  'admin',
  'Cjl@j2326082110',
  true,
  (SELECT id FROM deputado WHERE slug = 'carlos-silva' LIMIT 1)
)
ON CONFLICT (email) DO NOTHING;
