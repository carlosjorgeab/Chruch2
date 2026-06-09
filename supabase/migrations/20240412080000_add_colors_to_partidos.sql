// Migration to add colors to partidos table
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS cor_primaria VARCHAR(7);
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS cor_secundaria VARCHAR(7);
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS cor_terciaria VARCHAR(7);
