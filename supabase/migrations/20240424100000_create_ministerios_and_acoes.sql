-- Migration: Create ministerios and acoes tables, and add edital dates to orcamentos

-- 1. Create ministerios table
CREATE TABLE IF NOT EXISTS ministerios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    endereco TEXT,
    nome_contato VARCHAR(255),
    telefone_contato VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create acoes table
CREATE TABLE IF NOT EXISTS acoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_ministerio UUID REFERENCES ministerios(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add edital dates to orcamentos (Emendas)
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS data_inicial_edital DATE;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS data_final_edital DATE;

-- Enable RLS (if not already enabled globally, but let's be explicitly secure for these new tables)
ALTER TABLE ministerios ENABLE ROW LEVEL SECURITY;
ALTER TABLE acoes ENABLE ROW LEVEL SECURITY;

-- Simple policies for now (Allow all to authenticated users)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ministerios' AND policyname = 'Allow all for authenticated users') THEN
        CREATE POLICY "Allow all for authenticated users" ON ministerios FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'acoes' AND policyname = 'Allow all for authenticated users') THEN
        CREATE POLICY "Allow all for authenticated users" ON acoes FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;
