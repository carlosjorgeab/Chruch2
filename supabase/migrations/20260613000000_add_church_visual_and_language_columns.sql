-- Migration to add visual identity buttons color and default language to the churches (igrejas) table.
ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS cor_botoes VARCHAR(50) DEFAULT '#E4A232';
ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS idioma_padrao VARCHAR(10) DEFAULT 'pt';
