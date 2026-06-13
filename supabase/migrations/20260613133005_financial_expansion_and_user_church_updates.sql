-- =========================================================================
-- MIGRATION: 20260613133005_financial_expansion_and_user_church_updates.sql
-- Descrição: Novas tabelas financeiras (Categorias, Contas, Formas de Pagamento),
--            Suporte a múltiplos arquivos p/ Lançamento, Imagem no Usuário, Campo Logo da Igreja
-- Data: 2026-06-13
-- =========================================================================

-- 1. Tabela de Categorias Financeiras por Igreja
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('Crédito', 'Débito')),
  id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Formas de Pagamento por Igreja
CREATE TABLE IF NOT EXISTS formas_pagamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Alias table to guarantee compatibility
CREATE TABLE IF NOT EXISTS forma_pagamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Contas por Igreja
CREATE TABLE IF NOT EXISTS contas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  banco VARCHAR(255),
  agencia VARCHAR(50),
  conta_corrente VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Fornecedores por Igreja
CREATE TABLE IF NOT EXISTS fornecedor (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
  razao_social VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(50),
  endereco TEXT,
  telefone VARCHAR(50),
  email VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
  razao_social VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(50),
  endereco TEXT,
  telefone VARCHAR(50),
  email VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Adicionar colunas adicionais para Transações Financeiras
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS id_forma_pagamento UUID;
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS id_conta UUID;
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS id_fornecedor UUID;
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS data_vencimento DATE;

-- 6. Adicionar URL de imagem/foto ao Cadastro de Usuário
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 7. Tabela de Apoio para Arquivos Anexos (Suporte a múltiplos arquivos por lançamento)
CREATE TABLE IF NOT EXISTS arquivos_transacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_transacao UUID REFERENCES transacoes(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  tipo_arquivo VARCHAR(100),
  comprimento BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Registrar chaves separadas por idioma na tabela configuracoes_sistema para isolar traduções
INSERT INTO configuracoes_sistema (chave, valor, descricao)
VALUES 
  ('translation_overrides_pt', '{}', 'Ajustes de traducción en portugués'),
  ('translation_overrides_es', '{}', 'Ajustes de traducción en español'),
  ('translation_overrides_en', '{}', 'Ajustes de traducción en inglés')
ON CONFLICT (chave) DO NOTHING;
