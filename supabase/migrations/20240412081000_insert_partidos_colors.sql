-- Migration to insert/update parties and their colors

-- First ensure sigla is unique if not already
ALTER TABLE partidos DROP CONSTRAINT IF EXISTS partidos_sigla_key;
ALTER TABLE partidos ADD CONSTRAINT partidos_sigla_key UNIQUE (sigla);

INSERT INTO partidos (sigla, nome, cor_primaria, cor_secundaria, cor_terciaria) VALUES
('PT', 'Partido dos Trabalhadores', '#d80000', '#5d5f5f', '#ffcc00'),
('PL', 'Partido Liberal', '#003399', '#ffffff', '#ffcc00'),
('MDB', 'Movimento Democrático Brasileiro', '#00a859', '#f2a900', '#ffffff'),
('UNIÃO', 'União Brasil', '#002776', '#009c3b', '#ffdf00'),
('PP', 'Progressistas', '#005ca9', '#ffffff', '#005ca9'),
('PSD', 'Partido Social Democrático', '#003a70', '#ffd100', '#003a70'),
('REPUBLICANOS', 'Republicanos', '#005ca9', '#f2a900', '#ffffff'),
('PDT', 'Partido Democrático Trabalhista', '#ff0000', '#000000', '#ffffff'),
('PSB', 'Partido Socialista Brasileiro', '#ffcc00', '#ff0000', '#ffffff'),
('PSDB', 'Partido da Social Democracia Brasileira', '#005ca9', '#ffcc00', '#ffffff'),
('PSOL', 'Partido Socialismo e Liberdade', '#ffcc00', '#ff0000', '#ffffff'),
('PODE', 'Podemos', '#00a859', '#ffffff', '#00a859'),
('AVANTE', 'Avante', '#00a859', '#ffcc00', '#ffffff'),
('SOLIDARIEDADE', 'Solidariedade', '#f2a900', '#005ca9', '#ffffff'),
('CIDADANIA', 'Cidadania', '#ff0000', '#ffffff', '#000000'),
('PCdoB', 'Partido Comunista do Brasil', '#ff0000', '#ffcc00', '#ffffff'),
('NOVO', 'Partido Novo', '#ff6600', '#ffffff', '#000000'),
('PV', 'Partido Verde', '#00a859', '#ffffff', '#000000'),
('REDE', 'Rede Sustentabilidade', '#00a859', '#ffcc00', '#ffffff'),
('PRD', 'Partido da Renovação Democrática', '#005ca9', '#f2a900', '#ffffff'),
('PMB', 'Partido da Mulher Brasileira', '#005ca9', '#ffffff', '#005ca9'),
('AGIR', 'Agir', '#005ca9', '#ffffff', '#005ca9'),
('DC', 'Democracia Cristã', '#005ca9', '#ffcc00', '#ffffff'),
('PRTB', 'Partido Renovador Trabalhista Brasileiro', '#005ca9', '#ffcc00', '#ffffff'),
('MOBILIZA', 'Mobilização Nacional', '#005ca9', '#ffcc00', '#ffffff'),
('PMN', 'Partido da Mobilização Nacional', '#005ca9', '#ffcc00', '#ffffff'),
('UP', 'Unidade Popular', '#ff0000', '#000000', '#ffffff'),
('PCO', 'Partido da Causa Operária', '#ff0000', '#ffcc00', '#ffffff'),
('PCB', 'Partido Comunista Brasileiro', '#ff0000', '#ffcc00', '#ffffff'),
('PSTU', 'Partido Socialista dos Trabalhadores Unificado', '#ff0000', '#ffcc00', '#ffffff')
ON CONFLICT (sigla) DO UPDATE SET
  nome = EXCLUDED.nome,
  cor_primaria = EXCLUDED.cor_primaria,
  cor_secundaria = EXCLUDED.cor_secundaria,
  cor_terciaria = EXCLUDED.cor_terciaria;
