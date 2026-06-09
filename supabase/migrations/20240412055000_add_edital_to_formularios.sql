-- Migration: Adicionar coluna edital_pdf_base64 na tabela formularios_emenda

ALTER TABLE formularios_emenda ADD COLUMN IF NOT EXISTS edital_pdf_base64 TEXT;
