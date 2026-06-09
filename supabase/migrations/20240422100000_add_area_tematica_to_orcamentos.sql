-- Migration to add id_area_tematica to orcamentos table
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS id_area_tematica UUID REFERENCES areas_tematicas(id);
