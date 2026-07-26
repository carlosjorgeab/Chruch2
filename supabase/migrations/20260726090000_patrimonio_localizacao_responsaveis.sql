-- Migration: Add Responsável and Co-Responsável to Patrimonio Localizações and Movimentações

-- 1. Add responsavel_id and co_responsavel_id to patrimonio_localizacoes
ALTER TABLE public.patrimonio_localizacoes
ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES public.membros(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS co_responsavel_id UUID REFERENCES public.membros(id) ON DELETE SET NULL;

-- 2. Add responsavel and co_responsavel history tracking to patrimonio_movimentacoes
ALTER TABLE public.patrimonio_movimentacoes
ADD COLUMN IF NOT EXISTS responsavel_anterior_id UUID REFERENCES public.membros(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS responsavel_novo_id UUID REFERENCES public.membros(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS co_responsavel_anterior_id UUID REFERENCES public.membros(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS co_responsavel_novo_id UUID REFERENCES public.membros(id) ON DELETE SET NULL;
