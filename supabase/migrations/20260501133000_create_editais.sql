-- Migration: Create Editais table
CREATE TABLE editais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_deputado UUID REFERENCES deputado(id),
  titulo TEXT NOT NULL,
  arquivo_pdf_base64 TEXT,
  data_inicio DATE,
  data_fim DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE editais DISABLE ROW LEVEL SECURITY;
