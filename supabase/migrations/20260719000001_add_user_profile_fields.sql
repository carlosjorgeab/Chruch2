-- Migration to add user profile and session preference fields to the usuarios table
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS current_session_id TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'light';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS id_master BOOLEAN DEFAULT false;
