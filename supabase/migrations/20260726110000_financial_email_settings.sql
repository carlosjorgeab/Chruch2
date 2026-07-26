-- Migration: Seed default financial email alert configurations
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave VARCHAR(255) UNIQUE NOT NULL,
  valor TEXT,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO configuracoes_sistema (chave, valor, descricao)
VALUES 
  ('email_alertas_financeiro', '', 'Email destinatário para receber alertas e notificações financeiras do sistema'),
  ('notify_contas_vencimento', 'true', 'Ativar envio automático de emails com lembrete de contas próximas ao vencimento')
ON CONFLICT (chave) DO NOTHING;
