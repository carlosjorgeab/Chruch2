'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useConfirm } from '@/context/ConfirmContext';
import { Plus, Edit2, Trash2, Save, X, Building, ShieldAlert, AlertTriangle } from 'lucide-react';
import { formatCNPJ, formatTelefone, validateCNPJ } from '@/lib/masks';

type Igreja = {
  id: string;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  logo_url: string | null;
  slug: string | null;
  ativo: boolean;
  cor_fundo?: string | null;
  cor_paineis?: string | null;
  cor_bordas?: string | null;
  cor_fontes?: string | null;
  cor_botoes?: string | null;
  idioma_padrao?: string | null;
  assinatura_vigencia?: string | null;
};

export default function IgrejasPage() {
  const { user } = useAuth();
  const { confirmDelete } = useConfirm();
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentIgreja, setCurrentIgreja] = useState<Partial<Igreja>>({
    nome: '',
    cnpj: '',
    endereco: '',
    telefone: '',
    email: '',
    logo_url: '',
    slug: '',
    ativo: true,
    cor_fundo: '',
    cor_paineis: '',
    cor_bordas: '',
    cor_fontes: '',
    cor_botoes: '',
    idioma_padrao: 'pt',
    assinatura_vigencia: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchIgrejas();
  }, []);

  async function checkAndSuspendExpiredChurches(loadedIgrejas: Igreja[]) {
    try {
      const today = new Date();
      for (const ig of loadedIgrejas) {
        let isExpired = false;
        if (ig.assinatura_vigencia) {
          const expirationDate = new Date(ig.assinatura_vigencia + 'T23:59:59');
          if (expirationDate < today) {
            isExpired = true;
          }
        }

        if (isExpired || ig.ativo === false) {
          // Check if there are active users to suspend for this specific church
          const { data: activeUsers, error: fetchErr } = await supabase
            .from('usuarios')
            .select('id, ativo')
            .eq('id_igreja', ig.id)
            .eq('ativo', true);

          if (!fetchErr && activeUsers && activeUsers.length > 0) {
            await supabase
              .from('usuarios')
              .update({ ativo: false })
              .eq('id_igreja', ig.id);
          }
        } else {
          // Check if there are inactive users to activate for this specific church
          const { data: inactiveUsers, error: fetchErr } = await supabase
            .from('usuarios')
            .select('id, ativo')
            .eq('id_igreja', ig.id)
            .eq('ativo', false);

          if (!fetchErr && inactiveUsers && inactiveUsers.length > 0) {
            await supabase
              .from('usuarios')
              .update({ ativo: true })
              .eq('id_igreja', ig.id);
          }
        }
      }
    } catch (e) {
      console.error('Error in auto suspension/activation of church users:', e);
    }
  }

  async function fetchIgrejas() {
    try {
      setLoading(true);
      setError('');
      const { data, error: err } = await supabase
        .from('igrejas')
        .select('*')
        .order('nome', { ascending: true });

      if (err) throw err;
      if (data) {
        const parsedData = data.map((item: any) => {
          let addressPart = item.endereco || '';
          let vigenciaFromAddress = '';
          if (addressPart.includes('| VIGENCIA:')) {
            const parts = addressPart.split('| VIGENCIA:');
            addressPart = parts[0].trim();
            vigenciaFromAddress = parts[1].trim();
          }
          return {
            ...item,
            endereco: addressPart,
            assinatura_vigencia: item.assinatura_vigencia || vigenciaFromAddress,
          };
        });
        setIgrejas(parsedData);
        checkAndSuspendExpiredChurches(parsedData);
      }
    } catch (e: any) {
      setError('Erro ao carregar igrejas: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (igreja: Igreja) => {
    setCurrentIgreja(igreja);
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleNew = () => {
    setCurrentIgreja({
      nome: '',
      cnpj: '',
      endereco: '',
      telefone: '',
      email: '',
      logo_url: '',
      slug: '',
      ativo: true,
      cor_fundo: '',
      cor_paineis: '',
      cor_bordas: '',
      cor_fontes: '',
      cor_botoes: '',
      idioma_padrao: 'pt',
      assinatura_vigencia: '',
    });
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const generateUniqueSlug = (nome: string, currentId?: string | null) => {
    const stopWords = ['de', 'do', 'da', 'dos', 'das', 'e', 'em', 'para', 'com', 'o', 'a', 'os', 'as', 'igreja', 'congregacao', 'comunidade', 'paroquia', 'templo', 'capela', 'matriz'];
    const cleanWords = nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .split(/[\s_-]+/)
      .filter(w => w && !stopWords.includes(w));
    
    const shortWords = cleanWords.slice(0, 2);
    let baseSlug = shortWords.join('-');
    if (baseSlug.length > 20) {
      baseSlug = baseSlug.substring(0, 20);
    }
    baseSlug = baseSlug.replace(/^-+|-+$/g, '') || 'igr';

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (igrejas.some(ig => ig.slug === uniqueSlug && ig.id !== currentId)) {
      counter++;
      uniqueSlug = `${baseSlug}-${counter}`;
    }
    return uniqueSlug;
  };

  const handleNameChange = (nome: string) => {
    setCurrentIgreja(prev => ({
      ...prev,
      nome,
      slug: prev.id ? prev.slug : generateUniqueSlug(nome, prev.id), // Auto slug only on create
    }));
  };

  const handleDelete = (id: string, nome: string) => {
    if (igrejas.length <= 1) {
      setError('O sistema deve possuir pelo menos uma igreja cadastrada.');
      return;
    }
    confirmDelete({
      message: `Deseja realmente excluir a igreja "${nome}"? Esta operação não pode ser desfeita.`,
      onConfirm: async () => {
        try {
          const { error: err } = await supabase.from('igrejas').delete().eq('id', id);
          if (err) throw err;
          setSuccess('Igreja excluída com sucesso!');
          fetchIgrejas();
        } catch (e: any) {
          setError('Erro ao excluir igreja: ' + (e.message || e));
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentIgreja.nome) {
      setError('O nome da igreja é obrigatório.');
      return;
    }

    if (currentIgreja.cnpj && currentIgreja.cnpj.trim() !== '') {
      if (!validateCNPJ(currentIgreja.cnpj)) {
        setError('O CNPJ informado é inválido. Por favor, verifique os dígitos.');
        return;
      }
    }

    const slugToSave = (currentIgreja.slug || generateUniqueSlug(currentIgreja.nome, currentIgreja.id))
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const slugExists = igrejas.some(
      ig => ig.slug?.toLowerCase().trim() === slugToSave && ig.id !== currentIgreja.id
    );

    if (slugExists) {
      setError('Este Slug já está sendo utilizado por outra igreja. Por favor, insira um Slug que seja único.');
      return;
    }

    const addressToSave = currentIgreja.endereco ? 
      (currentIgreja.assinatura_vigencia ? `${currentIgreja.endereco || ''} | VIGENCIA:${currentIgreja.assinatura_vigencia}` : currentIgreja.endereco)
      : null;

    const payload: any = {
      nome: currentIgreja.nome,
      cnpj: currentIgreja.cnpj || null,
      endereco: addressToSave,
      telefone: currentIgreja.telefone || null,
      email: currentIgreja.email || null,
      logo_url: currentIgreja.logo_url || null,
      slug: slugToSave,
      ativo: currentIgreja.ativo !== undefined ? currentIgreja.ativo : true,
      cor_fundo: currentIgreja.cor_fundo || null,
      cor_paineis: currentIgreja.cor_paineis || null,
      cor_bordas: currentIgreja.cor_bordas || null,
      cor_fontes: currentIgreja.cor_fontes || null,
      cor_botoes: currentIgreja.cor_botoes || null,
      idioma_padrao: currentIgreja.idioma_padrao || 'pt',
      assinatura_vigencia: currentIgreja.assinatura_vigencia || null,
    };

    try {
      if (currentIgreja.id) {
        // Update
        let { error: err } = await supabase
          .from('igrejas')
          .update(payload)
          .eq('id', currentIgreja.id);
          
        if (err && (
          err.message?.includes('column "cor_fundo" of relation "igrejas" does not exist') ||
          err.message?.includes('column "cor_botoes" of relation "igrejas" does not exist') ||
          err.message?.includes('column "idioma_padrao" of relation "igrejas" does not exist') ||
          err.message?.includes('column "assinatura_vigencia" of relation "igrejas" does not exist')
        )) {
          const fallbackPayload: any = { ...payload };
          delete fallbackPayload.cor_fundo;
          delete fallbackPayload.cor_paineis;
          delete fallbackPayload.cor_bordas;
          delete fallbackPayload.cor_fontes;
          delete fallbackPayload.cor_botoes;
          delete fallbackPayload.idioma_padrao;
          delete fallbackPayload.assinatura_vigencia;
          const fallbackRes = await supabase
            .from('igrejas')
            .update(fallbackPayload)
            .eq('id', currentIgreja.id);
          err = fallbackRes.error;
        }

        if (err) throw err;
        setSuccess('Igreja atualizada com sucesso!');
      } else {
        // Insert
        let { error: err } = await supabase.from('igrejas').insert(payload);
        
        if (err && (
          err.message?.includes('column "cor_fundo" of relation "igrejas" does not exist') ||
          err.message?.includes('column "cor_botoes" of relation "igrejas" does not exist') ||
          err.message?.includes('column "idioma_padrao" of relation "igrejas" does not exist') ||
          err.message?.includes('column "assinatura_vigencia" of relation "igrejas" does not exist')
        )) {
          const fallbackPayload: any = { ...payload };
          delete fallbackPayload.cor_fundo;
          delete fallbackPayload.cor_paineis;
          delete fallbackPayload.cor_bordas;
          delete fallbackPayload.cor_fontes;
          delete fallbackPayload.cor_botoes;
          delete fallbackPayload.idioma_padrao;
          delete fallbackPayload.assinatura_vigencia;
          const fallbackRes = await supabase.from('igrejas').insert(fallbackPayload);
          err = fallbackRes.error;
        }

        if (err) throw err;
        setSuccess('Igreja cadastrada com sucesso!');
      }
      setIsEditing(false);
      fetchIgrejas();
    } catch (e: any) {
      setError('Erro ao salvar igreja: ' + (e.message || e));
    }
  };

  if (!user?.id_master) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 text-center space-y-4">
          <div className="w-16 h-16 bg-transparent text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Acesso Restrito</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Somente administradores globais do sistema podem gerenciar igrejas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-1">Administração</p>
          <h2 className="text-3xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">Igrejas</h2>
          <p className="text-slate-500 text-sm">Gerencie todas as congregações cadastradas no sistema</p>
        </div>
        {!isEditing && (
          <button
            onClick={handleNew}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition active:scale-95 text-sm uppercase tracking-wider"
          >
            <Plus size={18} />
            Cadastrar Igreja
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 font-bold text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 font-bold text-sm">
          {success}
        </div>
      )}

      {isEditing ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4 mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {currentIgreja.id ? 'Editar Igreja' : 'Nova Igreja'}
            </h3>
            <button
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  Nome da Congregação *
                </label>
                <input
                  type="text"
                  required
                  value={currentIgreja.nome || ''}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                  placeholder="Nome do Templo, Capela ou Matriz"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  Slug (Identificador único na URL)
                </label>
                <input
                  type="text"
                  required
                  value={currentIgreja.slug || ''}
                  onChange={(e) => setCurrentIgreja({ ...currentIgreja, slug: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 focus:border-amber-500 transition-all outline-none font-bold"
                  placeholder="ex: congregacao-pantecostes"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  CNPJ (Opcional)
                </label>
                <input
                  type="text"
                  value={currentIgreja.cnpj || ''}
                  onChange={(e) => setCurrentIgreja({ ...currentIgreja, cnpj: formatCNPJ(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                  placeholder="00.000.000/0001-00"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  Telefone (Opcional)
                </label>
                <input
                  type="text"
                  value={currentIgreja.telefone || ''}
                  onChange={(e) => setCurrentIgreja({ ...currentIgreja, telefone: formatTelefone(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-100 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  E-mail Oficial (Opcional)
                </label>
                <input
                  type="email"
                  value={currentIgreja.email || ''}
                  onChange={(e) => setCurrentIgreja({ ...currentIgreja, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                  placeholder="contato@igreja.com"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  Logo URL (Link da imagem)
                </label>
                <input
                  type="text"
                  value={currentIgreja.logo_url || ''}
                  onChange={(e) => setCurrentIgreja({ ...currentIgreja, logo_url: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                  placeholder="https://exemplo.com/logo.png"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  value={currentIgreja.endereco || ''}
                  onChange={(e) => setCurrentIgreja({ ...currentIgreja, endereco: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                  placeholder="Rua, Número, Bairro, Cidade - Estado"
                />
              </div>

              <div className="md:col-span-2 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1">
                  Vigência da Assinatura (Data de Vencimento)
                </label>
                <input
                  type="date"
                  value={currentIgreja.assinatura_vigencia || ''}
                  onChange={(e) => setCurrentIgreja({ ...currentIgreja, assinatura_vigencia: e.target.value })}
                  className="w-full max-w-xs px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 ml-1 leading-relaxed">
                  Defina o prazo limite para a assinatura da congregação. Se a data estiver vencida, todos os usuários da igreja vinculada serão suspensos e bloqueados automaticamente no login.
                </p>
              </div>

              <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-755 pt-6 bg-transparent">
                <h4 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-4 ml-1">
                  Identidade Visual & Configurações da Igreja
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      Fundo do App
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={currentIgreja.cor_fundo || '#f8fafc'}
                        onChange={(e) => {
                          setCurrentIgreja({ ...currentIgreja, cor_fundo: e.target.value });
                        }}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent p-0 flex-shrink-0"
                      />
                      <input
                        type="text"
                        value={currentIgreja.cor_fundo || ''}
                        onChange={(e) => setCurrentIgreja({ ...currentIgreja, cor_fundo: e.target.value })}
                        className="w-full px-2 py-1 border-2 border-slate-100 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 uppercase outline-none font-semibold text-center"
                        placeholder="#F8FAFC"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      Painéis (Cards)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={currentIgreja.cor_paineis || '#ffffff'}
                        onChange={(e) => setCurrentIgreja({ ...currentIgreja, cor_paineis: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent p-0 flex-shrink-0"
                      />
                      <input
                        type="text"
                        value={currentIgreja.cor_paineis || ''}
                        onChange={(e) => setCurrentIgreja({ ...currentIgreja, cor_paineis: e.target.value })}
                        className="w-full px-2 py-1 border-2 border-slate-100 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 uppercase outline-none font-semibold text-center"
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      Bordas
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={currentIgreja.cor_bordas || '#e2e8f0'}
                        onChange={(e) => setCurrentIgreja({ ...currentIgreja, cor_bordas: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent p-0 flex-shrink-0"
                      />
                      <input
                        type="text"
                        value={currentIgreja.cor_bordas || ''}
                        onChange={(e) => setCurrentIgreja({ ...currentIgreja, cor_bordas: e.target.value })}
                        className="w-full px-2 py-1 border-2 border-slate-100 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 uppercase outline-none font-semibold text-center"
                        placeholder="#E2E8F0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      Fontes (Texto)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={currentIgreja.cor_fontes || '#0f172a'}
                        onChange={(e) => setCurrentIgreja({ ...currentIgreja, cor_fontes: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent p-0 flex-shrink-0"
                      />
                      <input
                        type="text"
                        value={currentIgreja.cor_fontes || ''}
                        onChange={(e) => setCurrentIgreja({ ...currentIgreja, cor_fontes: e.target.value })}
                        className="w-full px-2 py-1 border-2 border-slate-100 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 uppercase outline-none font-semibold text-center"
                        placeholder="#0F172A"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      Botões do App
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={currentIgreja.cor_botoes || '#E4A232'}
                        onChange={(e) => setCurrentIgreja({ ...currentIgreja, cor_botoes: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent p-0 flex-shrink-0"
                      />
                      <input
                        type="text"
                        value={currentIgreja.cor_botoes || ''}
                        onChange={(e) => setCurrentIgreja({ ...currentIgreja, cor_botoes: e.target.value })}
                        className="w-full px-2 py-1 border-2 border-slate-100 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 uppercase outline-none font-semibold text-center"
                        placeholder="#E4A232"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 max-w-sm">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    Idioma Padrão da Igreja
                  </label>
                  <select
                    value={currentIgreja.idioma_padrao || 'pt'}
                    onChange={(e) => setCurrentIgreja({ ...currentIgreja, idioma_padrao: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold text-sm"
                  >
                    <option value="pt">Português (Brasil)</option>
                    <option value="en">English (US)</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                <p className="mt-4 text-slate-400 dark:text-slate-500 text-[10px] leading-relaxed">
                  * Deixe as cores em branco para usar as cores originais. O idioma padrão afetará a interface de todos os membros associados a esta igreja.
                </p>
              </div>

              <div className="md:col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={currentIgreja.ativo || false}
                  onChange={(e) => setCurrentIgreja({ ...currentIgreja, ativo: e.target.checked })}
                  className="w-5 h-5 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                />
                <label htmlFor="ativo" className="text-sm font-bold text-slate-755 dark:text-slate-300 cursor-pointer">
                  Igreja Ativa (Permite acesso aos usuários atrelados)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all uppercase text-xs tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-xl font-black transition-all shadow-md hover:opacity-90 uppercase text-xs tracking-wider"
              >
                <Save size={16} />
                Salvar Igreja
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
              Carregando Igrejas...
            </div>
          ) : igrejas.length === 0 ? (
            <div className="p-12 text-center text-slate-500 italic">
              Nenhuma igreja cadastrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <th className="px-6 py-4">Congregação</th>
                    <th className="px-6 py-4">Contato</th>
                    <th className="px-6 py-4">CNPJ</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium text-slate-700 dark:text-slate-300">
                  {igrejas.map((ig) => (
                    <tr key={ig.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-transparent text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center flex-shrink-0">
                            {ig.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={ig.logo_url} alt="Logo" className="w-8 h-8 object-cover rounded-md" />
                            ) : (
                              <Building size={20} />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                              <span>{ig.nome}</span>
                              {ig.ativo ? (
                                <span className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 text-[8px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded">Ativa</span>
                              ) : (
                                <span className="bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 text-[8px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded">Inativa</span>
                              )}
                              {ig.assinatura_vigencia && (
                                <span className={`text-[8px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded ${
                                  new Date(ig.assinatura_vigencia + 'T23:59:59') < new Date()
                                    ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'
                                    : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                                }`}>
                                  {new Date(ig.assinatura_vigencia + 'T23:59:59') < new Date()
                                    ? `Assinatura Vencida (${new Date(ig.assinatura_vigencia + 'T00:00:00').toLocaleDateString('pt-BR')})`
                                    : `Assinatura: ${new Date(ig.assinatura_vigencia + 'T00:00:00').toLocaleDateString('pt-BR')}`
                                  }
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-450 dark:text-slate-400 font-normal">slug: {ig.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">{ig.email || '-'}</div>
                        <div className="text-xs text-slate-450 dark:text-slate-400 font-normal">{ig.telefone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">{ig.cnpj || '-'}</td>
                      <td className="px-6 py-4 text-sm max-w-xs truncate">{ig.endereco || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(ig)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-lg"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(ig.id, ig.nome)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-lg"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
