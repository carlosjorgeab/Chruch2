-- Migration: Update formularios_emenda for Ministérios and Ações
ALTER TABLE formularios_emenda DROP COLUMN IF EXISTS id_emenda;
ALTER TABLE formularios_emenda ADD COLUMN id_ministerio UUID REFERENCES ministerios(id);
ALTER TABLE formularios_emenda ADD COLUMN id_acao UUID REFERENCES acoes(id);
ALTER TABLE formularios_emenda ADD COLUMN como_ficou_sabendo TEXT;
ALTER TABLE formularios_emenda ADD COLUMN concorda_regras BOOLEAN DEFAULT false;
