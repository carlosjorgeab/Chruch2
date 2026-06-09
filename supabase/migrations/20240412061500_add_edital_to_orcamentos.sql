-- Migration: Adicionar coluna edital_pdf_base64 na tabela orcamentos

ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS edital_pdf_base64 TEXT;
