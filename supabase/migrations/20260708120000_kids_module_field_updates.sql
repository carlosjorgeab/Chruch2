-- Migration: Adicionar campos de detalhes das crianças na tabela kids_sala_criancas
-- Esta migração expande a tabela de crianças nas salas de kids com campos adicionais para responsáveis, contato, restrições e termos de imagem.

ALTER TABLE kids_sala_criancas ADD COLUMN IF NOT EXISTS nome_responsavel VARCHAR(255);
ALTER TABLE kids_sala_criancas ADD COLUMN IF NOT EXISTS telefone_responsavel VARCHAR(50);
ALTER TABLE kids_sala_criancas ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE kids_sala_criancas ADD COLUMN IF NOT EXISTS sexo VARCHAR(15);
ALTER TABLE kids_sala_criancas ADD COLUMN IF NOT EXISTS necessidades_especiais TEXT;
ALTER TABLE kids_sala_criancas ADD COLUMN IF NOT EXISTS restricoes_alimentares TEXT;
ALTER TABLE kids_sala_criancas ADD COLUMN IF NOT EXISTS observacoes_medicas TEXT;
ALTER TABLE kids_sala_criancas ADD COLUMN IF NOT EXISTS autoriza_imagem BOOLEAN DEFAULT false;
ALTER TABLE kids_sala_criancas ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE kids_sala_criancas ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Aberto';
ALTER TABLE kids_sala_criancas ADD COLUMN IF NOT EXISTS observacao_checkout TEXT;
ALTER TABLE kids_sala_criancas ADD COLUMN IF NOT EXISTS data_checkout TIMESTAMP WITH TIME ZONE;

-- Garantir índices para buscas rápidas por responsável ou nome de visitante
CREATE INDEX IF NOT EXISTS idx_kids_sala_criancas_nome_resp ON kids_sala_criancas(nome_responsavel);
CREATE INDEX IF NOT EXISTS idx_kids_sala_criancas_nasc ON kids_sala_criancas(data_nascimento);
