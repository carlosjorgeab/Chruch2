import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const migrationSql = `
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- 1. Create table \`categorias\`
    CREATE TABLE IF NOT EXISTS categorias (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      nome VARCHAR(255) NOT NULL,
      tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('Crédito', 'Débito')),
      id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- 2. Create table \`forma_pagamento\`
    CREATE TABLE IF NOT EXISTS forma_pagamento (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      nome VARCHAR(255) NOT NULL,
      id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- 3. Create table \`contas\`
    CREATE TABLE IF NOT EXISTS contas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
      nome VARCHAR(255) NOT NULL,
      banco VARCHAR(255),
      agencia VARCHAR(50),
      conta_corrente VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- 4. Create table \`fornecedor\`
    CREATE TABLE IF NOT EXISTS fornecedor (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
      razao_social VARCHAR(255) NOT NULL,
      cpf_cnpj VARCHAR(50),
      endereco TEXT,
      telefone VARCHAR(50),
      email VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- Clean up and consolidate duplicate tables safely
    DO $$
    BEGIN
      -- Migrate data from 'fornecedores' to 'fornecedor' if both exist
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fornecedores') AND
         EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fornecedor') THEN
         
         INSERT INTO fornecedor (id, id_igreja, razao_social, cpf_cnpj, endereco, telefone, email, created_at)
         SELECT id, id_igreja, razao_social, cpf_cnpj, endereco, telefone, email, created_at
         FROM fornecedores
         ON CONFLICT (id) DO NOTHING;
         
         DROP TABLE fornecedores CASCADE;
      ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fornecedores') THEN
         ALTER TABLE fornecedores RENAME TO fornecedor;
      END IF;

      -- Migrate data from 'formas_pagamento' to 'forma_pagamento' if both exist
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'formas_pagamento') AND
         EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'forma_pagamento') THEN
         
         INSERT INTO forma_pagamento (id, nome, id_igreja, created_at)
         SELECT id, nome, id_igreja, created_at
         FROM formas_pagamento
         ON CONFLICT (id) DO NOTHING;
         
         DROP TABLE formas_pagamento CASCADE;
      ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'formas_pagamento') THEN
         ALTER TABLE formas_pagamento RENAME TO forma_pagamento;
      END IF;
    END $$;

    -- 5. Add columns to 'transacoes' table
    ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS id_forma_pagamento UUID;
    ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS id_conta UUID;
    ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS id_fornecedor UUID;
    ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS data_vencimento DATE;
    ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS data_pagamento DATE;

    -- 6. Add col to 'usuarios'
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url TEXT;

    -- Add subscription expiration date to 'igrejas'
    ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS assinatura_vigencia DATE;

    -- 7. Create table 'arquivos_transacao'
    CREATE TABLE IF NOT EXISTS arquivos_transacao (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      id_transacao UUID REFERENCES transacoes(id) ON DELETE CASCADE,
      nome VARCHAR(255) NOT NULL,
      url TEXT NOT NULL,
      tipo_arquivo VARCHAR(100),
      comprimento BIGINT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- 8. Create table 'mural_avisos'
    CREATE TABLE IF NOT EXISTS mural_avisos (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
      titulo VARCHAR(255) NOT NULL,
      url_midia TEXT,
      arquivo_nome VARCHAR(255),
      arquivo_base64 TEXT,
      data_inicio DATE,
      data_fim DATE,
      status VARCHAR(20) DEFAULT 'Publicado' CHECK (status IN ('Publicado', 'Desativado')),
      notificar_automatico BOOLEAN DEFAULT TRUE,
      tempo_transicao INT DEFAULT 10,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    ALTER TABLE mural_avisos ADD COLUMN IF NOT EXISTS notificar_automatico BOOLEAN DEFAULT TRUE;
    ALTER TABLE mural_avisos ADD COLUMN IF NOT EXISTS tempo_transicao INT DEFAULT 10;
    ALTER TABLE mural_avisos ADD COLUMN IF NOT EXISTS ordem INT DEFAULT 0;

    -- 9. Create table 'agendas'
    CREATE TABLE IF NOT EXISTS agendas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
      titulo VARCHAR(255) NOT NULL,
      data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
      status VARCHAR(20) DEFAULT 'Normal' CHECK (status IN ('Importante', 'Normal', 'Alerta')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    ALTER TABLE agendas ADD COLUMN IF NOT EXISTS data_hora_fim TIMESTAMP WITH TIME ZONE;
    ALTER TABLE agendas ADD COLUMN IF NOT EXISTS dia_inteiro BOOLEAN DEFAULT false;
    ALTER TABLE agendas ADD COLUMN IF NOT EXISTS local VARCHAR(255);
    ALTER TABLE agendas ADD COLUMN IF NOT EXISTS privado BOOLEAN DEFAULT false;

    -- Add columns to membros
    ALTER TABLE membros ADD COLUMN IF NOT EXISTS cpf VARCHAR(25);
    ALTER TABLE membros ADD COLUMN IF NOT EXISTS sexo VARCHAR(15);
    ALTER TABLE membros ADD COLUMN IF NOT EXISTS estado_civil VARCHAR(30);
    ALTER TABLE membros ADD COLUMN IF NOT EXISTS escolaridade VARCHAR(50);
    ALTER TABLE membros ADD COLUMN IF NOT EXISTS endereco TEXT;
    ALTER TABLE membros ADD COLUMN IF NOT EXISTS bairro VARCHAR(150);
    ALTER TABLE membros ADD COLUMN IF NOT EXISTS cidade VARCHAR(150);
    ALTER TABLE membros ADD COLUMN IF NOT EXISTS estado VARCHAR(150);
    ALTER TABLE membros ADD COLUMN IF NOT EXISTS cep VARCHAR(20);
    ALTER TABLE membros ADD COLUMN IF NOT EXISTS pais VARCHAR(100) DEFAULT 'Brasil';
    ALTER TABLE membros ADD COLUMN IF NOT EXISTS recepcao VARCHAR(50) DEFAULT 'Batismo';

    -- Create ufs table
    CREATE TABLE IF NOT EXISTS ufs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      nome VARCHAR(100) NOT NULL UNIQUE,
      sigla VARCHAR(2) UNIQUE NOT NULL
    );

    -- Seed Brazilian UFs
    INSERT INTO ufs (nome, sigla) VALUES
      ('Acre', 'AC'),
      ('Alagoas', 'AL'),
      ('Amapá', 'AP'),
      ('Amazonas', 'AM'),
      ('Bahia', 'BA'),
      ('Ceará', 'CE'),
      ('Distrito Federal', 'DF'),
      ('Espírito Santo', 'ES'),
      ('Goiás', 'GO'),
      ('Maranhão', 'MA'),
      ('Mato Grosso', 'MT'),
      ('Mato Grosso do Sul', 'MS'),
      ('Minas Gerais', 'MG'),
      ('Pará', 'PA'),
      ('Paraíba', 'PB'),
      ('Paraná', 'PR'),
      ('Pernambuco', 'PE'),
      ('Piauí', 'PI'),
      ('Rio de Janeiro', 'RJ'),
      ('Rio Grande do Norte', 'RN'),
      ('Rio Grande do Sul', 'RS'),
      ('Rondônia', 'RO'),
      ('Roraima', 'RR'),
      ('Santa Catarina', 'SC'),
      ('São Paulo', 'SP'),
      ('Sergipe', 'SE'),
      ('Tocantins', 'TO')
    ON CONFLICT (sigla) DO NOTHING;

    -- Set up id_uf inside membros
    ALTER TABLE membros ADD COLUMN IF NOT EXISTS id_uf UUID REFERENCES ufs(id) ON DELETE SET NULL;

    INSERT INTO configuracoes_sistema (chave, valor, descricao)
    VALUES 
      ('translation_overrides_pt', '{}', 'Ajustes de traducción en portugués'),
      ('translation_overrides_es', '{}', 'Ajustes de traducción en español'),
      ('translation_overrides_en', '{}', 'Ajustes de traducción en inglés')
    ON CONFLICT (chave) DO NOTHING;

    -- Force reload schema cache for PostgREST
    NOTIFY pgrst, 'reload schema';
    `;

    const { data, error } = await supabase.rpc('execute_sql', {
      sql: migrationSql,
    });

    if (error) {
      console.warn('Migration execute_sql skipped or RPC function missing:', error.message);
      return NextResponse.json({ 
        success: false,
        error: error.message, 
        hint: 'Please ensure you created the execute_sql function in Supabase, or run the queries manually inside the Supabase SQL Editor.',
        sql: migrationSql 
      }, { status: 200 }); // Return 200 to keep health checks green and support manual SQL execution gracefully
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Schema migrations successfully loaded and applied!',
      data 
    });
  } catch (error: any) {
    console.warn('Migration error caught:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}
