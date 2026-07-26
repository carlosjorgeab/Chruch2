import { supabase } from '@/lib/supabase';

export interface AuditParams {
  id_igreja?: string | null;
  usuario_id?: string | null;
  usuario_nome?: string | null;
  usuario_email?: string | null;
  acao: string; // e.g. 'CRIAR', 'EDITAR', 'EXCLUIR', 'CONFIGURACAO', 'LOGIN'
  modulo: string; // e.g. 'Financeiro', 'Patrimônio', 'Membros', 'Configurações', 'Agenda'
  detalhes: string;
  dados_anteriores?: any;
  dados_novos?: any;
  ip_address?: string | null;
}

export async function registrarAuditoria(params: AuditParams) {
  try {
    const payload = {
      id_igreja: params.id_igreja || null,
      usuario_id: params.usuario_id || null,
      usuario_nome: params.usuario_nome || 'Sistema',
      usuario_email: params.usuario_email || null,
      acao: params.acao,
      modulo: params.modulo,
      detalhes: params.detalhes,
      dados_anteriores: params.dados_anteriores ? JSON.parse(JSON.stringify(params.dados_anteriores)) : null,
      dados_novos: params.dados_novos ? JSON.parse(JSON.stringify(params.dados_novos)) : null,
      ip_address: params.ip_address || null,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('auditoria').insert([payload]);
    if (error) {
      console.warn('Erro ao inserir log de auditoria:', error.message);
    }
  } catch (err) {
    console.error('Falha na função de registrarAuditoria:', err);
  }
}
