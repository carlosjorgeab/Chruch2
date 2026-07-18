-- Migration: Add juros, acrescimos, and valor_pago columns to transacoes
-- Date: 2026-07-18

ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS juros NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS acrescimos NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS valor_pago NUMERIC(15, 2) DEFAULT 0;

-- Update existing rows if null to set sensible default values
UPDATE transacoes SET juros = 0 WHERE juros IS NULL;
UPDATE transacoes SET acrescimos = 0 WHERE acrescimos IS NULL;
UPDATE transacoes SET valor_pago = valor WHERE valor_pago IS NULL OR valor_pago = 0;
