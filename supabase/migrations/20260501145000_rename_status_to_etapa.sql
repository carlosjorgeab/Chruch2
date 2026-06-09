-- Migration: Rename status to etapa in orcamentos and projetos
ALTER TABLE orcamentos RENAME COLUMN status TO etapa;
ALTER TABLE projetos RENAME COLUMN status TO etapa;

-- Re-add constraints if needed (though they should carry over)
ALTER TABLE orcamentos ADD CONSTRAINT orcamentos_etapa_check CHECK (etapa IN ('Rascunho', 'Liberado'));

ALTER TABLE projetos ADD CONSTRAINT projetos_etapa_check CHECK (etapa IN ('Rascunho', 'Liberado'));
