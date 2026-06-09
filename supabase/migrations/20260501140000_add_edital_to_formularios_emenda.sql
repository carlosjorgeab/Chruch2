-- Migration: Add id_edital to formularios_emenda
ALTER TABLE formularios_emenda ADD COLUMN id_edital UUID REFERENCES editais(id);
