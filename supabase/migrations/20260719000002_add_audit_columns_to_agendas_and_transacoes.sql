-- Migration to add audit log columns to the agendas and transacoes tables
ALTER TABLE public.agendas ADD COLUMN IF NOT EXISTS criado_por_nome TEXT;
ALTER TABLE public.agendas ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.agendas ADD COLUMN IF NOT EXISTS atualizado_por_nome TEXT;
ALTER TABLE public.agendas ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS criado_por_nome TEXT;
ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS atualizado_por_nome TEXT;
ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE;
