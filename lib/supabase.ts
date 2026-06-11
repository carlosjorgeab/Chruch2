import { createClient } from '@supabase/supabase-js';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
try {
  const url = new URL(supabaseUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Invalid protocol');
  }
} catch (e) {
  supabaseUrl = 'https://zavwqwjjzqjksnpitnqz.supabase.co';
}
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_g_1K5Tus33laiGohG9-1ig_SmJAuXv2';

const realSupabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Robust Local Storage Database Fallback Mock & Seed Engine
 */
function getInitialSeed(table: string): any[] {
  const todayStr = new Date().toISOString().split('T')[0];
  
  if (table === 'igrejas') {
    return [
      {
        id: 'c807b53a-be7d-418f-bc6a-ae53cbdf0169',
        nome: 'Igreja Central de Porto Alegre',
        cnpj: '12.345.678/0001-99',
        endereco: 'Av. Júlio de Castilhos, 125, Porto Alegre - RS',
        telefone: '(51) 3224-0000',
        email: 'contato@igrejacentral.org',
        logo_url: '',
        slug: 'igreja-central',
        ativo: true,
      },
      {
        id: '01df0720-3b32-45e0-811b-7a0e1c0c66fe',
        nome: 'Assembleia de Deus - Setor Sul',
        cnpj: '98.765.432/0001-00',
        endereco: 'Rua das Flores, 450, São Paulo - SP',
        telefone: '(11) 98888-7777',
        email: 'setorsul@assembleia.org.br',
        logo_url: '',
        slug: 'assembleia-setor-sul',
        ativo: true,
      }
    ];
  }

  if (table === 'perfis') {
    return [
      {
        id: 'admin-profile-id',
        nome: 'Administrador',
        permissoes: ['all'],
        created_at: new Date().toISOString(),
      },
      {
        id: 'pastor-profile-id',
        nome: 'Pastor / Ministério',
        permissoes: ['membros', 'comunidades', 'licoes', 'presencas'],
        created_at: new Date().toISOString(),
      },
      {
        id: 'tesoureiro-profile-id',
        nome: 'Tesoureiro',
        permissoes: ['financeiro'],
        created_at: new Date().toISOString(),
      }
    ];
  }

  if (table === 'usuarios') {
    return [
      {
        id: 'admin-user-id',
        email: 'carlosjorgeab@gmail.com',
        senha: 'admin',
        id_perfil: 'admin-profile-id',
        id_igreja: 'c807b53a-be7d-418f-bc6a-ae53cbdf0169',
        is_admin: true,
        theme_preference: 'light',
        created_at: new Date().toISOString(),
      },
      {
        id: 'pastor-user-id',
        email: 'pastor@email.com',
        senha: 'pastor',
        id_perfil: 'pastor-profile-id',
        id_igreja: 'c807b53a-be7d-418f-bc6a-ae53cbdf0169',
        is_admin: false,
        theme_preference: 'light',
        created_at: new Date().toISOString(),
      }
    ];
  }

  if (table === 'membros') {
    return [
      {
        id: 'membro-1',
        id_igreja: 'c807b53a-be7d-418f-bc6a-ae53cbdf0169',
        nome: 'Carlos Jorge Silva',
        email: 'carlosjorgeab@gmail.com',
        telefone: '(51) 99999-8888',
        data_nascimento: '1980-05-15',
        status: 'Ativo',
        batizado_aguas: true,
        batizado_espirito: true,
        cargo: 'Pastor',
        foto_url: '',
        created_at: new Date().toISOString(),
      },
      {
        id: 'membro-2',
        id_igreja: 'c807b53a-be7d-418f-bc6a-ae53cbdf0169',
        nome: 'Ana Maria Santos',
        email: 'ana.santos@email.com',
        telefone: '(51) 98888-7777',
        data_nascimento: '1992-08-22',
        status: 'Ativo',
        batizado_aguas: true,
        batizado_espirito: false,
        cargo: 'Diácono',
        foto_url: '',
        created_at: new Date().toISOString(),
      },
      {
        id: 'membro-3',
        id_igreja: 'c807b53a-be7d-418f-bc6a-ae53cbdf0169',
        nome: 'João Pedro Souza',
        email: 'joao.pedro@email.com',
        telefone: '(51) 97777-6666',
        data_nascimento: '1987-11-02',
        status: 'Ativo',
        batizado_aguas: true,
        batizado_espirito: true,
        cargo: 'Membro',
        foto_url: '',
        created_at: new Date().toISOString(),
      },
      {
        id: 'membro-4',
        id_igreja: 'c807b53a-be7d-418f-bc6a-ae53cbdf0169',
        nome: 'Mariana Costa',
        email: 'mariana.costa@email.com',
        telefone: '(51) 96666-5555',
        data_nascimento: '2001-03-30',
        status: 'Visitante',
        batizado_aguas: false,
        batizado_espirito: false,
        cargo: 'Membro',
        foto_url: '',
        created_at: new Date().toISOString(),
      },
      {
        id: 'membro-5',
        id_igreja: '01df0720-3b32-45e0-811b-7a0e1c0c66fe',
        nome: 'Gabriel Barbosa',
        email: 'gabriel.b@email.com',
        telefone: '(11) 91111-2222',
        data_nascimento: '1985-04-12',
        status: 'Ativo',
        batizado_aguas: true,
        batizado_espirito: true,
        cargo: 'Pastor',
        foto_url: '',
        created_at: new Date().toISOString(),
      }
    ];
  }

  if (table === 'comunidades') {
    return [
      {
        id: 'comunidade-1',
        id_igreja: 'c807b53a-be7d-418f-bc6a-ae53cbdf0169',
        nome: 'Célula Graça e Paz',
        descricao: 'Grupo de comunhão familial e estudo das escrituras',
        dia_reuniao: 'Quarta-feira',
        horario: '20:00',
        local: 'Residência da Ana Maria Santos',
        id_lider: 'membro-2',
        created_at: new Date().toISOString(),
      },
      {
        id: 'comunidade-2',
        id_igreja: 'c807b53a-be7d-418f-bc6a-ae53cbdf0169',
        nome: 'Mocidade Jovens Fortes',
        descricao: 'Encontro de jovens para adoração e palavra',
        dia_reuniao: 'Sábado',
        horario: '19:30',
        local: 'Salão Social da Igreja',
        id_lider: 'membro-3',
        created_at: new Date().toISOString(),
      }
    ];
  }

  if (table === 'lecoes') {
    return [
      {
        id: 'lecao-1',
        id_igreja: 'c807b53a-be7d-418f-bc6a-ae53cbdf0169',
        titulo: 'Introdução ao Livro de Romanos',
        descricao: 'Estudo teológico profundo sobre a graça divina justificada pela fé.',
        tipo: 'Estudo Bíblico',
        referencia_biblica: 'Romanos 1:1-17',
        data: todayStr,
        id_professor: 'membro-1',
        status: 'Programada',
        created_at: new Date().toISOString(),
      },
      {
        id: 'lecao-2',
        id_igreja: 'c807b53a-be7d-418f-bc6a-ae53cbdf0169',
        titulo: 'Princípios de Fé e Obras',
        descricao: 'Análise integrada da teologia de Tiago sobre o viver cristão prático.',
        tipo: 'Estudo Bíblico',
        referencia_biblica: 'Tiago 2:14-26',
        data: todayStr,
        id_professor: 'membro-2',
        status: 'Completada',
        created_at: new Date().toISOString(),
      }
    ];
  }

  if (table === 'presencas') {
    return [
      {
        id: 'presenca-1',
        id_igreja: 'c807b53a-be7d-418f-bc6a-ae53cbdf0169',
        id_lecao: 'lecao-2',
        id_comunidade: 'comunidade-1',
        id_membro: 'membro-2',
        status_presenca: 'Presente',
        created_at: new Date().toISOString(),
      },
      {
        id: 'presenca-2',
        id_igreja: 'c807b53a-be7d-418f-bc6a-ae53cbdf0169',
        id_lecao: 'lecao-2',
        id_comunidade: 'comunidade-1',
        id_membro: 'membro-3',
        status_presenca: 'Presente',
        created_at: new Date().toISOString(),
      }
    ];
  }

  if (table === 'configuracoes_sistema') {
    return [
      { id: '1', chave: 'session_timeout', valor: '30', descricao: 'Tempo de inatividade em minutos' },
      { id: '2', chave: 'disable_multi_login', valor: 'true', descricao: 'Desativar logins múltiplos simultâneos' },
      { id: '3', chave: 'theme_default', valor: 'light', descricao: 'Tema padrão do sistema' },
      { id: '4', chave: 'language_default', valor: 'pt', descricao: 'Idioma padrão da interface' },
      { id: '5', chave: 'notify_new_members', valor: 'true', descricao: 'Notificar quando um novo membro cadastrar' },
      { id: '6', chave: 'notify_lessons', valor: 'true', descricao: 'Notificar cronogramas de lições da EBD' },
      { id: '7', chave: 'notify_low_balance', valor: 'false', descricao: 'Alertar sobre saldo financeiro baixo' },
      { id: '8', chave: 'notify_birthdays', valor: 'true', descricao: 'Alertar sobre aniversariantes do dia' }
    ];
  }

  if (table === 'transacoes') {
    return [
      {
        id: 'transacoes-1',
        id_igreja: 'c807b53a-be7d-418f-bc6a-ae53cbdf0169',
        tipo: 'Entrada',
        categoria: 'Dízimo',
        descricao: 'Dízimo entregue por Carlos Jorge Silva',
        valor: 1500.00,
        data: todayStr,
        membro_contribuinte: 'Carlos Jorge Silva',
        created_at: new Date().toISOString(),
      },
      {
        id: 'transacoes-2',
        id_igreja: 'c807b53a-be7d-418f-bc6a-ae53cbdf0169',
        tipo: 'Entrada',
        categoria: 'Oferta',
        descricao: 'Ofertas recolhidas no culto de celebração de domingo',
        valor: 850.00,
        data: todayStr,
        membro_contribuinte: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 'transacoes-3',
        id_igreja: 'c807b53a-be7d-418f-bc6a-ae53cbdf0169',
        tipo: 'Saída',
        categoria: 'Aluguel',
        descricao: 'Aluguel do salão principal do templo municipal',
        valor: 1100.00,
        data: todayStr,
        membro_contribuinte: null,
        created_at: new Date().toISOString(),
      }
    ];
  }

  return [];
}

function executeLocalQuery(table: string, chain: any[]): { data: any; error: any } {
  if (typeof window === 'undefined') {
    return { data: [], error: null };
  }

  const storageKey = `ch_db_${table}`;
  let records: any[] = [];
  const stored = window.localStorage.getItem(storageKey);
  if (stored) {
    try {
      records = JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  } else {
    records = getInitialSeed(table);
    window.localStorage.setItem(storageKey, JSON.stringify(records));
  }

  let operation = 'select'; // select, insert, update, delete, upsert
  let insertPayloads: any[] = [];
  let updatePayload: any = {};
  let upsertPayload: any = null;
  let upsertOptions: any = {};
  let filters: Array<{ field: string; val: any; type: string }> = [];
  let orderByField: string | null = null;
  let orderByAscending = true;
  let isSingle = false;
  let limitVal: number | null = null;

  for (const item of chain) {
    if (item.type === 'select') {
      operation = 'select';
    } else if (item.type === 'insert') {
      operation = 'insert';
      insertPayloads = Array.isArray(item.args[0]) ? item.args[0] : [item.args[0]];
    } else if (item.type === 'update') {
      operation = 'update';
      updatePayload = item.args[0];
    } else if (item.type === 'upsert') {
      operation = 'upsert';
      upsertPayload = item.args[0];
      upsertOptions = item.args[1] || {};
    } else if (item.type === 'delete') {
      operation = 'delete';
    } else if (item.type === 'eq') {
      filters.push({ field: item.args[0], val: item.args[1], type: 'eq' });
    } else if (item.type === 'like') {
      filters.push({ field: item.args[0], val: item.args[1], type: 'like' });
    } else if (item.type === 'order') {
      orderByField = item.args[0];
      orderByAscending = item.args[1]?.ascending !== false;
    } else if (item.type === 'single') {
      isSingle = true;
    } else if (item.type === 'limit') {
      limitVal = item.args[0];
    }
  }

  const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // 1. Insert Operation
  if (operation === 'insert') {
    const newRecords = insertPayloads.map(p => {
      const id = p.id || uuidv4();
      return {
        id,
        created_at: new Date().toISOString(),
        ...p
      };
    });
    records = [...newRecords, ...records];
    window.localStorage.setItem(storageKey, JSON.stringify(records));
    return { data: isSingle ? newRecords[0] : (insertPayloads.length === 1 ? newRecords[0] : newRecords), error: null };
  }

  // 1.5. Upsert Operation
  if (operation === 'upsert') {
    const conflictField = upsertOptions.onConflict || 'id';
    const payloads = Array.isArray(upsertPayload) ? upsertPayload : [upsertPayload];
    
    payloads.forEach(p => {
      const matchValue = p[conflictField];
      const matchIdx = records.findIndex(r => r && String(r[conflictField]) === String(matchValue));
      if (matchIdx !== -1) {
        records[matchIdx] = { ...records[matchIdx], ...p, updated_at: new Date().toISOString() };
      } else {
        records.push({
          id: p.id || uuidv4(),
          created_at: new Date().toISOString(),
          ...p
        });
      }
    });

    window.localStorage.setItem(storageKey, JSON.stringify(records));
    const returnedData = Array.isArray(upsertPayload) ? payloads : payloads[0];
    return { data: returnedData, error: null };
  }

  // 2. Identify filtering match array
  let filteredIndices: number[] = [];
  records.forEach((rec, idx) => {
    let match = true;
    for (const filter of filters) {
      if (filter.type === 'eq') {
        const val = rec[filter.field];
        if (val === undefined || String(val) !== String(filter.val)) {
          match = false;
          break;
        }
      } else if (filter.type === 'like') {
        const val = String(rec[filter.field] || '').toLowerCase();
        const searchPattern = String(filter.val).replace(/%/g, '').toLowerCase();
        if (!val.includes(searchPattern)) {
          match = false;
          break;
        }
      }
    }
    if (match) {
      filteredIndices.push(idx);
    }
  });

  // 3. Update Operation
  if (operation === 'update') {
    let updatedRecords: any[] = [];
    records = records.map((rec, idx) => {
      if (filteredIndices.includes(idx)) {
        const updated = { ...rec, ...updatePayload, updated_at: new Date().toISOString() };
        updatedRecords.push(updated);
        return updated;
      }
      return rec;
    });
    window.localStorage.setItem(storageKey, JSON.stringify(records));
    return { data: isSingle ? updatedRecords[0] : updatedRecords, error: null };
  }

  // 4. Delete Operation
  if (operation === 'delete') {
    const deletedRecords = filteredIndices.map(idx => records[idx]);
    records = records.filter((_, idx) => !filteredIndices.includes(idx));
    window.localStorage.setItem(storageKey, JSON.stringify(records));
    return { data: deletedRecords, error: null };
  }

  // 5. Select Operation
  let results = filteredIndices.map(idx => records[idx]);

  // Special join mock logic for users profiles
  if (table === 'usuarios') {
    const profiles = JSON.parse(window.localStorage.getItem('ch_db_perfis') || JSON.stringify(getInitialSeed('perfis')));
    results = results.map(u => {
      const matchedProfile = profiles.find((p: any) => p.id === u.id_perfil);
      return {
        ...u,
        perfil: matchedProfile ? { nome: matchedProfile.nome, permissoes: matchedProfile.permissoes } : null
      };
    });
  }

  if (orderByField) {
    results.sort((a, b) => {
      const valA = a[orderByField!];
      const valB = b[orderByField!];
      if (valA === undefined || valB === undefined) return 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        return orderByAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return orderByAscending ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
    });
  }

  if (limitVal !== null) {
    results = results.slice(0, limitVal);
  }

  return { data: isSingle ? (results[0] || null) : results, error: null };
}

/**
 * Smart Chained Query Builder proxying Supabase structures or falling back to localStorage
 */
class SmartBuilder {
  private tableName: string;
  private chain: any[] = [];
  private realQueryBuilder: any;

  constructor(tableName: string, realQueryBuilder: any) {
    this.tableName = tableName;
    this.realQueryBuilder = realQueryBuilder;
  }

  select(...args: any[]) {
    this.chain.push({ type: 'select', args });
    if (this.realQueryBuilder) {
      this.realQueryBuilder = this.realQueryBuilder.select(...args);
    }
    return this;
  }

  insert(...args: any[]) {
    this.chain.push({ type: 'insert', args });
    if (this.realQueryBuilder) {
      this.realQueryBuilder = this.realQueryBuilder.insert(...args);
    }
    return this;
  }

  upsert(...args: any[]) {
    this.chain.push({ type: 'upsert', args });
    if (this.realQueryBuilder) {
      this.realQueryBuilder = this.realQueryBuilder.upsert(...args);
    }
    return this;
  }

  update(...args: any[]) {
    this.chain.push({ type: 'update', args });
    if (this.realQueryBuilder) {
      this.realQueryBuilder = this.realQueryBuilder.update(...args);
    }
    return this;
  }

  delete(...args: any[]) {
    this.chain.push({ type: 'delete', args });
    if (this.realQueryBuilder) {
      this.realQueryBuilder = this.realQueryBuilder.delete(...args);
    }
    return this;
  }

  eq(...args: any[]) {
    this.chain.push({ type: 'eq', args });
    if (this.realQueryBuilder) {
      this.realQueryBuilder = this.realQueryBuilder.eq(...args);
    }
    return this;
  }

  order(...args: any[]) {
    this.chain.push({ type: 'order', args });
    if (this.realQueryBuilder) {
      this.realQueryBuilder = this.realQueryBuilder.order(...args);
    }
    return this;
  }

  limit(...args: any[]) {
    this.chain.push({ type: 'limit', args });
    if (this.realQueryBuilder) {
      this.realQueryBuilder = this.realQueryBuilder.limit(...args);
    }
    return this;
  }

  single(...args: any[]) {
    this.chain.push({ type: 'single', args });
    if (this.realQueryBuilder) {
      this.realQueryBuilder = this.realQueryBuilder.single(...args);
    }
    return this;
  }

  like(...args: any[]) {
    this.chain.push({ type: 'like', args });
    if (this.realQueryBuilder) {
      this.realQueryBuilder = this.realQueryBuilder.like(...args);
    }
    return this;
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const forceLocal = typeof window !== 'undefined' && window.localStorage.getItem(`use_local_${this.tableName}`) === 'true';
      if (forceLocal) {
        const localData = executeLocalQuery(this.tableName, this.chain);
        return onfulfilled ? onfulfilled(localData) : localData;
      }

      if (this.realQueryBuilder) {
        const result = await this.realQueryBuilder;
        if (result.error && (
          result.error.code === 'PGRST205' || 
          result.error.message?.includes('schema cache') || 
          result.error.message?.includes('not found') || 
          result.error.message?.includes('Relation') || 
          result.error.status === 404
        )) {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(`use_local_${this.tableName}`, 'true');
          }
          console.warn(`Table ${this.tableName} not found in Supabase. Falling back to local Storage.`);
          const localData = executeLocalQuery(this.tableName, this.chain);
          return onfulfilled ? onfulfilled(localData) : localData;
        }
        return onfulfilled ? onfulfilled(result) : result;
      } else {
        const localData = executeLocalQuery(this.tableName, this.chain);
        return onfulfilled ? onfulfilled(localData) : localData;
      }
    } catch (err: any) {
      if (err.message?.includes('schema cache') || err.message?.includes('relation') || err.status === 404 || err.code === 'PGRST205') {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(`use_local_${this.tableName}`, 'true');
        }
        const localData = executeLocalQuery(this.tableName, this.chain);
        return onfulfilled ? onfulfilled(localData) : localData;
      }
      return onrejected ? onrejected(err) : Promise.reject(err);
    }
  }
}

export const supabase = {
  ...realSupabase,
  from(tableName: string) {
    return new SmartBuilder(tableName, realSupabase.from(tableName));
  },
  rpc(name: string, args?: any) {
    return realSupabase.rpc(name, args);
  },
  auth: realSupabase.auth,
  storage: realSupabase.storage,
};
