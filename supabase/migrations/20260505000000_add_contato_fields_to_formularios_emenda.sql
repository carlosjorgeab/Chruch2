-- Migration: Add contact fields to formularios_emenda
-- Description: Adds columns for contact full name, telephone, and email to the 'formularios_emenda' table.

ALTER TABLE formularios_emenda ADD COLUMN IF NOT EXISTS contato_nome TEXT;
ALTER TABLE formularios_emenda ADD COLUMN IF NOT EXISTS contato_telefone TEXT;
ALTER TABLE formularios_emenda ADD COLUMN IF NOT EXISTS contato_email TEXT;
