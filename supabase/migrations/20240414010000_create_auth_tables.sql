-- Create perfis table
CREATE TABLE IF NOT EXISTS perfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  permissoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create usuarios table
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  id_perfil UUID REFERENCES perfis(id),
  id_deputado UUID REFERENCES deputado(id),
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert Admin user
INSERT INTO usuarios (email, senha, is_admin)
VALUES ('admin', 'Cjl@j2326082110', true)
ON CONFLICT (email) DO NOTHING;
