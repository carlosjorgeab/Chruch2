-- Migration: Increase sigla limit in partidos table
ALTER TABLE partidos ALTER COLUMN sigla TYPE VARCHAR(20);
