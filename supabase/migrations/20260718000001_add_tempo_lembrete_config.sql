-- Adiciona a configuração de tempo de lembrete padrão no sistema
INSERT INTO configuracoes_sistema (chave, valor, descricao)
VALUES ('tempo_lembrete', '15', 'Tempo padrão em minutos para notificação de lembretes da agenda antes do evento iniciar')
ON CONFLICT (chave) DO NOTHING;
