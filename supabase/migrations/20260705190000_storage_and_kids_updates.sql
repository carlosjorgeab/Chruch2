-- Migration: Configure storage policies for 'files' bucket and consolidate Kids tables

-- 1. Create the bucket 'files' if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing storage policies if they exist to prevent duplicates
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow public read on files" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated inserts on files" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated updates on files" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated deletes on files" ON storage.objects;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 3. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Recreate storage policies for 'files' bucket
CREATE POLICY "Allow public read on files" ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'files');

CREATE POLICY "Allow authenticated inserts on files" ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'files' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates on files" ON storage.objects 
  FOR UPDATE 
  USING (bucket_id = 'files' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated deletes on files" ON storage.objects 
  FOR DELETE 
  USING (bucket_id = 'files' AND auth.role() = 'authenticated');

-- 5. Ensure Kids Module tables are created with proper church reference cascades
CREATE TABLE IF NOT EXISTS kids_turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_igreja UUID REFERENCES igrejas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  idade_minima INT,
  idade_maxima INT,
  capacidade INT,
  tipo_entrada VARCHAR(50) CHECK (tipo_entrada IN ('Link Público', 'Manual', 'Automático')),
  imagem_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS kids_turma_membros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_turma UUID REFERENCES kids_turmas(id) ON DELETE CASCADE,
  id_membro UUID REFERENCES membros(id) ON DELETE CASCADE,
  cargo VARCHAR(50) CHECK (cargo IN ('Lider', 'Coordenador', 'Supervisor', 'Professor', 'Auxiliar', 'Monitor', 'Recepcionista', 'Berçario', 'Voluntário', 'Segurança', 'Apoio')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(id_turma, id_membro)
);

CREATE TABLE IF NOT EXISTS kids_salas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_turma UUID REFERENCES kids_turmas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  idade_minima INT,
  idade_maxima INT,
  capacidade INT,
  status VARCHAR(50) DEFAULT 'Fechado' CHECK (status IN ('Fechado', 'Aberto', 'Encerrado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS kids_programacao_sala (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sala UUID REFERENCES kids_salas(id) ON DELETE CASCADE,
  id_agenda UUID REFERENCES agendas(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS kids_sala_criancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sala UUID REFERENCES kids_salas(id) ON DELETE CASCADE,
  tipo_crianca VARCHAR(20) CHECK (tipo_crianca IN ('Membro', 'Visitante')),
  id_membro UUID REFERENCES membros(id) ON DELETE SET NULL,
  nome_visitante VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
