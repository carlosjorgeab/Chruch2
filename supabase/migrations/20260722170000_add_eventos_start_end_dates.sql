-- Migration to add data_inicio and data_fim to eventos table
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS data_inicio TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS data_fim TIMESTAMP WITH TIME ZONE;
