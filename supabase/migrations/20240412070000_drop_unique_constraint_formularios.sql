-- Migration: Drop unique constraint on id_emenda in formularios_emenda

ALTER TABLE formularios_emenda DROP CONSTRAINT IF EXISTS formularios_emenda_id_emenda_key;
