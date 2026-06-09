-- Migration: Add icone_url to areas_tematicas
-- Description: Adds a column 'icone_url' to 'areas_tematicas' table to store bordered icon/image representing each area.

ALTER TABLE areas_tematicas ADD COLUMN IF NOT EXISTS icone_url TEXT;
