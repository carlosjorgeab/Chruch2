-- Migration: Create Patrimônio Module Tables

CREATE TABLE public.patrimonio_categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_igreja UUID REFERENCES public.igrejas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.patrimonio_localizacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_igreja UUID REFERENCES public.igrejas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.patrimonios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_igreja UUID REFERENCES public.igrejas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    numero_tombamento VARCHAR(100),
    valor_aquisicao DECIMAL(10, 2),
    data_aquisicao DATE,
    estado_conservacao VARCHAR(50) DEFAULT 'BOM' CHECK (estado_conservacao IN ('NOVO', 'BOM', 'REGULAR', 'RUIM', 'SUCATA')),
    status VARCHAR(50) DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'EM_MANUTENCAO', 'EMPRESTADO', 'BAIXADO')),
    foto_url TEXT,
    categoria_id UUID REFERENCES public.patrimonio_categorias(id) ON DELETE SET NULL,
    localizacao_id UUID REFERENCES public.patrimonio_localizacoes(id) ON DELETE SET NULL,
    criado_por_nome VARCHAR(255),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    atualizado_por_nome VARCHAR(255),
    atualizado_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.patrimonio_movimentacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patrimonio_id UUID REFERENCES public.patrimonios(id) ON DELETE CASCADE,
    tipo_movimentacao VARCHAR(50) NOT NULL CHECK (tipo_movimentacao IN ('AQUISICAO', 'MANUTENCAO', 'EMPRESTIMO', 'DEVOLUCAO', 'MUDANCA_LOCAL', 'BAIXA')),
    data_movimentacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    responsavel VARCHAR(255),
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
