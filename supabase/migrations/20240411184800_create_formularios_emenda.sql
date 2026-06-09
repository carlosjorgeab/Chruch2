-- Migration: Criar tabela de formularios_emenda

CREATE TABLE formularios_emenda (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_emenda UUID REFERENCES orcamentos(id) ON DELETE CASCADE UNIQUE,
  nome_entidade VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20) NOT NULL,
  nome_projeto VARCHAR(255) NOT NULL,
  resumo_projeto TEXT NOT NULL,
  descricao_projeto TEXT NOT NULL,
  orcamento_url TEXT,
  curriculo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
