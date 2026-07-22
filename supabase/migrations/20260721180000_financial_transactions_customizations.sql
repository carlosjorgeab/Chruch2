-- Migration: Add data_pagamento and observacoes to transacoes table

ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS data_pagamento DATE;
ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS observacoes TEXT;
