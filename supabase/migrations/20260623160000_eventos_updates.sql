-- Migration: Update Eventos module schema
-- Criar o Módulo de Eventos no Perfil, no upload de arquivos, drag e drop, edição de programação, retirar palestrante/agenda para o principal, etc.

-- Upgrades for Eventos module changes
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS palestrante VARCHAR(255);
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS id_agenda UUID REFERENCES agendas(id) ON DELETE SET NULL;
ALTER TABLE eventos_programacao ADD COLUMN IF NOT EXISTS data_hora TIMESTAMP WITH TIME ZONE;
