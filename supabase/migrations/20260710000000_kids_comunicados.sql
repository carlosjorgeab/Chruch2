-- Migration: Create kids_comunicados table to store announcements/bulletins with attachments
-- Date: 2026-07-10

CREATE TABLE IF NOT EXISTS kids_comunicados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_sala UUID REFERENCES kids_salas(id) ON DELETE CASCADE,
  criancas_ids JSONB NOT NULL, -- List of selected children IDs (e.g. ["uuid1", "uuid2"] or ["all"])
  tipo VARCHAR(50) NOT NULL, -- Observação, Ocorrências, Conteúdo, Evidências, Outros
  enviar_responsaveis BOOLEAN DEFAULT false,
  descricao TEXT NOT NULL,
  arquivos JSONB DEFAULT '[]'::jsonb, -- List of files: [{"name": "file.jpg", "url": "https://..."}]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE kids_comunicados DISABLE ROW LEVEL SECURITY;
