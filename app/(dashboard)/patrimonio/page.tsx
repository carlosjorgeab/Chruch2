'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useIgreja } from '@/context/IgrejaContext';
import { useConfirm } from '@/context/ConfirmContext';
import { Plus, Edit2, Trash2, Save, Search, Package, Layers, MapPin, BarChart3, AlertCircle, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function PatrimonioPage() {
  const { user, hasPermission } = useAuth();
  const { selectedIgreja } = useIgreja();
  const { confirmDelete } = useConfirm();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'bens' | 'categorias' | 'locais'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Permission Checks
  const canReadPatrimonio = user?.id_master || user?.is_admin || hasPermission('/patrimonio') || hasPermission('patrimonio');
  const canEditPatrimonio = user?.id_master || user?.is_admin || hasPermission('patrimonio:editar') || hasPermission('patrimonio:novo') || hasPermission('patrimonio');
  const canReadCategorias = user?.id_master || user?.is_admin || hasPermission('/patrimonio_categorias') || hasPermission('patrimonio_categorias') || hasPermission('patrimonio');
  const canEditCategorias = user?.id_master || user?.is_admin || hasPermission('patrimonio_categorias:editar') || hasPermission('patrimonio_categorias:novo') || hasPermission('patrimonio_categorias');

  // State
  const [categorias, setCategorias] = useState<any[]>([]);
  const [locais, setLocais] = useState<any[]>([]);
  const [bens, setBens] = useState<any[]>([]);

  // Modals
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [currentCategoria, setCurrentCategoria] = useState<any>({ nome: '', descricao: '' });
  
  const [showLocalModal, setShowLocalModal] = useState(false);
  const [currentLocal, setCurrentLocal] = useState<any>({ nome: '', descricao: '' });

  const [showBemModal, setShowBemModal] = useState(false);
  const [currentBem, setCurrentBem] = useState<any>({
    nome: '', descricao: '', numero_tombamento: '', valor_aquisicao: '', data_aquisicao: '', 
    estado_conservacao: 'BOM', status: 'ATIVO', categoria_id: '', localizacao_id: ''
  });

  const [showQRModal, setShowQRModal] = useState(false);
  const [qrBem, setQrBem] = useState<any>(null);

  useEffect(() => {
    if (selectedIgreja?.id) {
      fetchData();
    }
  }, [selectedIgreja?.id]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchCategorias(),
      fetchLocais(),
      fetchBens()
    ]);
    setLoading(false);
  };

  const fetchCategorias = async () => {
    if (!selectedIgreja?.id) return;
    const { data } = await supabase
      .from('patrimonio_categorias')
      .select('*')
      .eq('id_igreja', selectedIgreja.id)
      .order('nome');
    if (data) setCategorias(data);
  };

  const fetchLocais = async () => {
    if (!selectedIgreja?.id) return;
    const { data } = await supabase
      .from('patrimonio_localizacoes')
      .select('*')
      .eq('id_igreja', selectedIgreja.id)
      .order('nome');
    if (data) setLocais(data);
  };

  const fetchBens = async () => {
    if (!selectedIgreja?.id) return;
    const { data } = await supabase
      .from('patrimonios')
      .select('*, categoria:patrimonio_categorias(nome), local:patrimonio_localizacoes(nome)')
      .eq('id_igreja', selectedIgreja.id)
      .order('created_at', { ascending: false });
    if (data) setBens(data);
  };

  const handleSaveCategoria = async () => {
    if (!currentCategoria.nome) return setError('Nome da categoria é obrigatório.');
    const payload = {
      nome: currentCategoria.nome,
      descricao: currentCategoria.descricao,
      id_igreja: selectedIgreja?.id
    };

    if (currentCategoria.id) {
      await supabase.from('patrimonio_categorias').update(payload).eq('id', currentCategoria.id);
    } else {
      await supabase.from('patrimonio_categorias').insert([payload]);
    }
    setShowCategoriaModal(false);
    fetchCategorias();
    setSuccess('Categoria salva com sucesso!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteCategoria = async (id: string) => {
    confirmDelete({
      message: 'Tem certeza que deseja excluir esta categoria? Bens associados podem perder a referência.',
      onConfirm: async () => {
        await supabase.from('patrimonio_categorias').delete().eq('id', id);
        fetchCategorias();
      }
    });
  };

  const handleSaveLocal = async () => {
    if (!currentLocal.nome) return setError('Nome do local é obrigatório.');
    const payload = {
      nome: currentLocal.nome,
      descricao: currentLocal.descricao,
      id_igreja: selectedIgreja?.id
    };

    if (currentLocal.id) {
      await supabase.from('patrimonio_localizacoes').update(payload).eq('id', currentLocal.id);
    } else {
      await supabase.from('patrimonio_localizacoes').insert([payload]);
    }
    setShowLocalModal(false);
    fetchLocais();
    setSuccess('Local salvo com sucesso!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteLocal = async (id: string) => {
    confirmDelete({
      message: 'Tem certeza que deseja excluir este local?',
      onConfirm: async () => {
        await supabase.from('patrimonio_localizacoes').delete().eq('id', id);
        fetchLocais();
      }
    });
  };

  const handleSaveBem = async () => {
    if (!currentBem.nome) return setError('Nome do bem é obrigatório.');
    if (!currentBem.categoria_id) return setError('Categoria é obrigatória.');
    
    const payload = {
      nome: currentBem.nome,
      descricao: currentBem.descricao,
      numero_tombamento: currentBem.numero_tombamento,
      valor_aquisicao: currentBem.valor_aquisicao ? parseFloat(currentBem.valor_aquisicao) : null,
      data_aquisicao: currentBem.data_aquisicao || null,
      estado_conservacao: currentBem.estado_conservacao,
      status: currentBem.status,
      categoria_id: currentBem.categoria_id,
      localizacao_id: currentBem.localizacao_id || null,
      id_igreja: selectedIgreja?.id,
      atualizado_por_nome: user?.nome,
      atualizado_em: new Date().toISOString()
    };

    if (currentBem.id) {
      await supabase.from('patrimonios').update(payload).eq('id', currentBem.id);
    } else {
      await supabase.from('patrimonios').insert([{ ...payload, criado_por_nome: user?.nome }]);
    }
    setShowBemModal(false);
    fetchBens();
    setSuccess('Bem salvo com sucesso!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteBem = async (id: string) => {
    confirmDelete({
      message: 'Tem certeza que deseja dar baixa/excluir este bem?',
      onConfirm: async () => {
        await supabase.from('patrimonios').delete().eq('id', id);
        fetchBens();
      }
    });
  };

  if (!canReadPatrimonio) {
    return <div className="p-8 text-center text-slate-500">Você não tem permissão para acessar este módulo.</div>;
  }

  const totalBens = bens.length;
  const bensAtivos = bens.filter(b => b.status === "ATIVO").length;
  const bensManutencao = bens.filter(b => b.status === "EM_MANUTENCAO").length;
  const valorTotal = bens.reduce((acc, curr) => acc + (parseFloat(curr.valor_aquisicao) || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" />
            Gestão de Patrimônio
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Controle de inventário, móveis e equipamentos
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-600 rounded-xl flex items-center gap-2 border border-rose-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl flex items-center gap-2 border border-emerald-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'dashboard' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Visão Geral</div>
        </button>
        <button
          onClick={() => setActiveTab('bens')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'bens' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <div className="flex items-center gap-2"><Package className="w-4 h-4" /> Bens e Ativos</div>
        </button>
        {canReadCategorias && (
          <>
            <button
              onClick={() => setActiveTab('categorias')}
              className={`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'categorias' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2"><Layers className="w-4 h-4" /> Categorias</div>
            </button>
            <button
              onClick={() => setActiveTab('locais')}
              className={`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'locais' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Localizações</div>
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Bens</span>
                <span className="text-3xl font-black text-slate-800 dark:text-white">{totalBens}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Bens Ativos</span>
                <span className="text-3xl font-black text-slate-800 dark:text-white">{bensAtivos}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Em Manutenção</span>
                <span className="text-3xl font-black text-slate-800 dark:text-white">{bensManutencao}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Valor Total Estimado</span>
                <span className="text-3xl font-black text-slate-800 dark:text-white">
                  R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* TAB: BENS */}
          {activeTab === 'bens' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, tombamento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                {canEditPatrimonio && (
                  <button
                    onClick={() => {
                      setCurrentBem({
                        nome: '', descricao: '', numero_tombamento: '', valor_aquisicao: '', data_aquisicao: '', 
                        estado_conservacao: 'BOM', status: 'ATIVO', categoria_id: '', localizacao_id: ''
                      });
                      setShowBemModal(true);
                    }}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-2xl transition-all shadow-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Novo Bem
                  </button>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Bem</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Local / Categoria</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Tombamento</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {bens
                      .filter(b => b.nome.toLowerCase().includes(searchTerm.toLowerCase()) || (b.numero_tombamento || '').toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((bem) => (
                      <tr key={bem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{bem.nome}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{bem.local?.nome || '-'}</p>
                          <p className="text-xs text-slate-400">{bem.categoria?.nome || '-'}</p>
                        </td>
                        <td className="p-4 text-sm text-slate-500 font-mono">
                          {bem.numero_tombamento || '-'}
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            bem.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-700' :
                            bem.status === 'EM_MANUTENCAO' ? 'bg-amber-100 text-amber-700' :
                            bem.status === 'BAIXADO' ? 'bg-rose-100 text-rose-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {bem.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setQrBem(bem);
                                setShowQRModal(true);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                              title="QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                            {canEditPatrimonio && (
                              <>
                                <button
                                  onClick={() => {
                                    setCurrentBem(bem);
                                    setShowBemModal(true);
                                  }}
                                  className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBem(bem.id)}
                                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {bens.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                          Nenhum bem cadastrado ou encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: CATEGORIAS */}
          {activeTab === 'categorias' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white">Categorias de Patrimônio</h3>
                {canEditCategorias && (
                  <button
                    onClick={() => {
                      setCurrentCategoria({ nome: '', descricao: '' });
                      setShowCategoriaModal(true);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Nova Categoria
                  </button>
                )}
              </div>
              <div className="p-6">
                <div className="grid gap-3">
                  {categorias.map(cat => (
                    <div key={cat.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{cat.nome}</p>
                        {cat.descricao && <p className="text-xs text-slate-500">{cat.descricao}</p>}
                      </div>
                      {canEditCategorias && (
                        <div className="flex gap-2">
                          <button onClick={() => { setCurrentCategoria(cat); setShowCategoriaModal(true); }} className="p-2 text-slate-400 hover:text-amber-500"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteCategoria(cat.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  ))}
                  {categorias.length === 0 && <p className="text-center text-slate-500 text-sm py-4">Nenhuma categoria cadastrada.</p>}
                </div>
              </div>
            </div>
          )}

          {/* TAB: LOCAIS */}
          {activeTab === 'locais' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white">Localizações Físicas</h3>
                {canEditCategorias && (
                  <button
                    onClick={() => {
                      setCurrentLocal({ nome: '', descricao: '' });
                      setShowLocalModal(true);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Novo Local
                  </button>
                )}
              </div>
              <div className="p-6">
                <div className="grid gap-3">
                  {locais.map(loc => (
                    <div key={loc.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{loc.nome}</p>
                        {loc.descricao && <p className="text-xs text-slate-500">{loc.descricao}</p>}
                      </div>
                      {canEditCategorias && (
                        <div className="flex gap-2">
                          <button onClick={() => { setCurrentLocal(loc); setShowLocalModal(true); }} className="p-2 text-slate-400 hover:text-amber-500"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteLocal(loc.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  ))}
                  {locais.length === 0 && <p className="text-center text-slate-500 text-sm py-4">Nenhum local cadastrado.</p>}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL: BEM */}
      {showBemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {currentBem.id ? 'Editar Bem' : 'Novo Bem'}
              </h3>
              <button onClick={() => setShowBemModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome do Bem *</label>
                  <input type="text" value={currentBem.nome} onChange={(e) => setCurrentBem({ ...currentBem, nome: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nº Tombamento / Plaqueta</label>
                  <input type="text" value={currentBem.numero_tombamento || ''} onChange={(e) => setCurrentBem({ ...currentBem, numero_tombamento: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Categoria *</label>
                  <select value={currentBem.categoria_id || ''} onChange={(e) => setCurrentBem({ ...currentBem, categoria_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none">
                    <option value="">Selecione...</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Localização</label>
                  <select value={currentBem.localizacao_id || ''} onChange={(e) => setCurrentBem({ ...currentBem, localizacao_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none">
                    <option value="">Selecione...</option>
                    {locais.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Status</label>
                  <select value={currentBem.status} onChange={(e) => setCurrentBem({ ...currentBem, status: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none">
                    <option value="ATIVO">Ativo</option>
                    <option value="EM_MANUTENCAO">Em Manutenção</option>
                    <option value="EMPRESTADO">Emprestado</option>
                    <option value="BAIXADO">Baixado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Valor Aquisição (R$)</label>
                  <input type="number" step="0.01" value={currentBem.valor_aquisicao || ''} onChange={(e) => setCurrentBem({ ...currentBem, valor_aquisicao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Estado de Conservação</label>
                  <select value={currentBem.estado_conservacao} onChange={(e) => setCurrentBem({ ...currentBem, estado_conservacao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none">
                    <option value="NOVO">Novo</option>
                    <option value="BOM">Bom</option>
                    <option value="REGULAR">Regular</option>
                    <option value="RUIM">Ruim</option>
                    <option value="SUCATA">Sucata</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição</label>
                  <textarea rows={3} value={currentBem.descricao || ''} onChange={(e) => setCurrentBem({ ...currentBem, descricao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              <button onClick={() => setShowBemModal(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
              <button onClick={handleSaveBem} className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-2xl shadow-sm flex items-center gap-2"><Save className="w-4 h-4" /> Salvar Bem</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CATEGORIA & LOCAL (Shared Layout) */}
      {(showCategoriaModal || showLocalModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {showCategoriaModal ? (currentCategoria.id ? 'Editar Categoria' : 'Nova Categoria') : (currentLocal.id ? 'Editar Local' : 'Novo Local')}
              </h3>
              <button onClick={() => { setShowCategoriaModal(false); setShowLocalModal(false); }} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome *</label>
                <input 
                  type="text" 
                  value={showCategoriaModal ? currentCategoria.nome : currentLocal.nome} 
                  onChange={(e) => showCategoriaModal ? setCurrentCategoria({ ...currentCategoria, nome: e.target.value }) : setCurrentLocal({ ...currentLocal, nome: e.target.value })} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição</label>
                <textarea 
                  rows={2} 
                  value={showCategoriaModal ? (currentCategoria.descricao || '') : (currentLocal.descricao || '')} 
                  onChange={(e) => showCategoriaModal ? setCurrentCategoria({ ...currentCategoria, descricao: e.target.value }) : setCurrentLocal({ ...currentLocal, descricao: e.target.value })} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none" 
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => { setShowCategoriaModal(false); setShowLocalModal(false); }} className="px-4 py-2 text-sm font-bold text-slate-500">Cancelar</button>
              <button onClick={showCategoriaModal ? handleSaveCategoria : handleSaveLocal} className="px-6 py-2 bg-amber-500 text-white text-sm font-bold rounded-xl"><Save className="w-4 h-4 inline mr-2" /> Salvar</button>
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL: QR CODE */}
      {showQRModal && qrBem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowQRModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-8 text-center space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{qrBem.nome}</h3>
            <div className="bg-white p-4 rounded-2xl inline-block shadow-sm">
              <QRCodeSVG value={`patrimonio:${qrBem.id}`} size={200} />
            </div>
            <p className="text-xs text-slate-500 font-mono">{qrBem.numero_tombamento || 'S/N'}</p>
            <button onClick={() => setShowQRModal(false)} className="w-full px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl">Fechar</button>
          </div>
        </div>
      )}

    </div>
  );
}
