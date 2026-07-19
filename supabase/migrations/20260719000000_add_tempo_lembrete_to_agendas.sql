-- Migration to add tempo_lembrete column to agendas table
ALTER TABLE public.agendas ADD COLUMN IF NOT EXISTS tempo_lembrete INTEGER DEFAULT 15;
