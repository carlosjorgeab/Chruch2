-- Migration for the recent group and member customization updates

-- 1. Updates to communities (comunidades) table
ALTER TABLE public.comunidades ADD COLUMN IF NOT EXISTS id_segundo_lider UUID REFERENCES public.membros(id) ON DELETE SET NULL;
ALTER TABLE public.comunidades ADD COLUMN IF NOT EXISTS id_terceiro_lider UUID REFERENCES public.membros(id) ON DELETE SET NULL;
ALTER TABLE public.comunidades ADD COLUMN IF NOT EXISTS imagem_base64 TEXT;
ALTER TABLE public.comunidades ADD COLUMN IF NOT EXISTS imagem_nome VARCHAR(255);
ALTER TABLE public.comunidades ADD COLUMN IF NOT EXISTS categoria VARCHAR(100);

-- 2. Updates to members (membros) table
ALTER TABLE public.membros ADD COLUMN IF NOT EXISTS categoria VARCHAR(100);
ALTER TABLE public.membros ADD COLUMN IF NOT EXISTS criado_por_nome TEXT;
ALTER TABLE public.membros ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.membros ADD COLUMN IF NOT EXISTS atualizado_por_nome TEXT;
ALTER TABLE public.membros ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.membros ADD COLUMN IF NOT EXISTS data_batismo DATE;
ALTER TABLE public.membros ADD COLUMN IF NOT EXISTS data_conversao DATE;
ALTER TABLE public.membros ADD COLUMN IF NOT EXISTS id_conjuge UUID REFERENCES public.membros(id) ON DELETE SET NULL;
ALTER TABLE public.membros ADD COLUMN IF NOT EXISTS id_grupo UUID REFERENCES public.comunidades(id) ON DELETE SET NULL;
ALTER TABLE public.membros ADD COLUMN IF NOT EXISTS id_comunidade UUID REFERENCES public.comunidades(id) ON DELETE SET NULL;
