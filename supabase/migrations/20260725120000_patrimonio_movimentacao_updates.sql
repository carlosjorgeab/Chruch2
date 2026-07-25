-- Alter responsavel to reference membros(id)
ALTER TABLE public.patrimonio_movimentacoes 
ADD COLUMN responsavel_id UUID REFERENCES public.membros(id) ON DELETE SET NULL;

-- If there are any UUIDs currently in responsavel, copy them
UPDATE public.patrimonio_movimentacoes 
SET responsavel_id = responsavel::uuid 
WHERE responsavel ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Drop the old varchar column and rename the new one back
ALTER TABLE public.patrimonio_movimentacoes 
DROP COLUMN responsavel;

ALTER TABLE public.patrimonio_movimentacoes 
RENAME COLUMN responsavel_id TO responsavel;

-- Add location tracking columns to movimentacoes
ALTER TABLE public.patrimonio_movimentacoes
ADD COLUMN localizacao_atual_id UUID REFERENCES public.patrimonio_localizacoes(id) ON DELETE SET NULL,
ADD COLUMN nova_localizacao_id UUID REFERENCES public.patrimonio_localizacoes(id) ON DELETE SET NULL;
