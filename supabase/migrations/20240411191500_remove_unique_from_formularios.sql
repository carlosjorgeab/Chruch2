-- Migration: Remover constraint UNIQUE de id_emenda na tabela formularios_emenda

ALTER TABLE formularios_emenda DROP CONSTRAINT IF EXISTS formularios_emenda_id_emenda_key;
