const fs = require('fs');

const content = `'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useIgreja } from '@/context/IgrejaContext';
import { useConfirm } from '@/context/ConfirmContext';
import { Plus, Edit2, Trash2, Save, Search, Package, Layers, MapPin, BarChart3, AlertCircle, QrCode, ArrowLeft, Image as ImageIcon, Camera, History, FileText, Download, Calendar, X, ArrowRightLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';

const calculateDepreciation = (valor: number | null | undefined, data_aquisicao: string | null | undefined, estado: string) => {
  if (!valor) return 0;
  
  let currentValue = valor;
  
  if (data_aquisicao) {
    const aquisicao = new Date(data_aquisicao);
    const now = new Date();
    const ageInYears = (now.getTime() - aquisicao.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (ageInYears > 0) {
      const depreciationRate = 0.10; // 10% per year
      const factor = Math.max(0, 1 - (ageInYears * depreciationRate));
      currentValue = currentValue * factor;
    }
  }
  
  const stateMultiplier: Record<string, number> = {
    'NOVO': 1.0,
    'BOM': 0.8,
    'REGULAR': 0.5,
    'RUIM': 0.2,
    'SUCATA': 0.05
  };
  
  currentValue = currentValue * (stateMultiplier[estado] || 1.0);
  
  return currentValue;
};

export default function PatrimonioPage() {
  const { user, hasPermission } = useAuth();
  const { selectedIgreja } = useIgreja();
  const { confirmDelete } = useConfirm();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'bens' | 'categorias' | 'locais' | 'movimentacoes' | 'relatorios'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states (replacing popups)
  const [isEditingBem, setIsEditingBem] = useState(false);
  const [isEditingCategoria, setIsEditingCategoria] = useState(false);
  const [isEditingLocal, setIsEditingLocal] = useState(false);
  const [isEditingMovimentacao, setIsEditingMovimentacao] = useState(false);

  // Permission Checks
  const canReadPatrimonio = user?.id_master || user?.is_admin || hasPermission('/patrimonio') || hasPermission('patrimonio');
  const canEditPatrimonio = user?.id_master || user?.is_admin || hasPermission('patrimonio:editar') || hasPermission('patrimonio:novo') || hasPermission('patrimonio');
  const canReadCategorias = user?.id_master || user?.is_admin || hasPermission('/patrimonio_categorias') || hasPermission('patrimonio_categorias') || hasPermission('patrimonio');
  const canEditCategorias = user?.id_master || user?.is_admin || hasPermission('patrimonio_categorias:editar') || hasPermission('patrimonio_categorias:novo') || hasPermission('patrimonio_categorias');

  // State arrays
  const [categorias, setCategorias] = useState<any[]>([]);
  const [locais, setLocais] = useState<any[]>([]);
  const [bens, setBens] = useState<any[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);

  // Current items
  const [currentCategoria, setCurrentCategoria] = useState<any>({ nome: '', descricao: '' });
  const [currentLocal, setCurrentLocal] = useState<any>({ nome: '', descricao: '' });
  const [currentBem, setCurrentBem] = useState<any>({
    nome: '', descricao: '', numero_tombamento: '', valor_aquisicao: '', data_aquisicao: '', 
    estado_conservacao: 'BOM', status: 'ATIVO', categoria_id: '', localizacao_id: '', foto_url: ''
  });
  const [currentMovimentacao, setCurrentMovimentacao] = useState<any>({
    patrimonio_id: '', tipo_movimentacao: 'MUDANCA_LOCAL', responsavel: '', observacao: '', data_movimentacao: new Date().toISOString().split('T')[0]
  });

  const [showQRModal, setShowQRModal] = useState(false);
  const [qrBem, setQrBem] = useState<any>(null);

  // Image Upload states
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Reports State
  const [relatorioTipo, setRelatorioTipo] = useState<'bens' | 'movimentacoes'>('bens');
  const [relatorioLocalizacao, setRelatorioLocalizacao] = useState('');
  const [relatorioDataInicial, setRelatorioDataInicial] = useState('');
  const [relatorioDataFinal, setRelatorioDataFinal] = useState('');
  const [relatorioResult, setRelatorioResult] = useState<any[] | null>(null);

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
      fetchBens(),
      fetchMovimentacoes()
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

  const fetchMovimentacoes = async () => {
    if (!selectedIgreja?.id) return;
    const { data } = await supabase
      .from('patrimonio_movimentacoes')
      .select('*, bem:patrimonios(nome)')
      .order('data_movimentacao', { ascending: false });
      
    // Filtramos localmente para as movimentacoes dessa igreja baseadas no array de bens
    // ou se houver id_igreja na tabela movimentacoes
    if (data && bens.length > 0) {
      const churchBensIds = bens.map(b => b.id);
      const filtered = data.filter(m => churchBensIds.includes(m.patrimonio_id));
      setMovimentacoes(filtered);
    } else if (data) {
       // Se ainda não carregou bens, vamos carregar tudo mas depois recarregar
       setMovimentacoes(data);
    }
  };

  // Upload Logic
  const handleFileSelection = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    const file = selectedFiles[0];
    
    setIsUploading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/financeiro/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro no servidor de upload.');
      }
      
      if (result.success && result.url) {
        setCurrentBem((prev: any) => ({ ...prev, foto_url: result.url }));
        setSuccess(`Foto carregada com sucesso!`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      console.error(err);
      setError('Erro ao enviar imagem.');
    } finally {
      setIsUploading(false);
      setIsDragging(false);
    }
  };

  // CRUD Categorias
  const handleSaveCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
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
    
    setIsEditingCategoria(false);
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

  // CRUD Locais
  const handleSaveLocal = async (e: React.FormEvent) => {
    e.preventDefault();
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
    
    setIsEditingLocal(false);
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

  // CRUD Bens
  const handleSaveBem = async (e: React.FormEvent) => {
    e.preventDefault();
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
      foto_url: currentBem.foto_url || null,
      id_igreja: selectedIgreja?.id,
      atualizado_por_nome: user?.nome,
      atualizado_em: new Date().toISOString()
    };

    if (currentBem.id) {
      await supabase.from('patrimonios').update(payload).eq('id', currentBem.id);
    } else {
      await supabase.from('patrimonios').insert([{ ...payload, criado_por_nome: user?.nome, criado_em: new Date().toISOString() }]);
    }
    
    setIsEditingBem(false);
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

  const handleQuickStatusChange = async (bem: any) => {
    const statuses = ['ATIVO', 'EM_MANUTENCAO', 'BAIXADO'];
    const currentIndex = statuses.indexOf(bem.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    
    setBens(prev => prev.map(b => b.id === bem.id ? { ...b, status: nextStatus } : b));

    const { error } = await supabase
      .from('patrimonios')
      .update({ 
        status: nextStatus,
        atualizado_por_nome: user?.nome,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', bem.id);
      
    if (error) {
      fetchBens();
      setError('Erro ao atualizar status.');
      setTimeout(() => setError(''), 3000);
    }
  };

  // CRUD Movimentações
  const handleSaveMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMovimentacao.patrimonio_id) return setError('Obrigatório selecionar o bem.');
    if (!currentMovimentacao.responsavel) return setError('Responsável é obrigatório.');

    const payload = {
      patrimonio_id: currentMovimentacao.patrimonio_id,
      tipo_movimentacao: currentMovimentacao.tipo_movimentacao,
      responsavel: currentMovimentacao.responsavel,
      observacao: currentMovimentacao.observacao,
      data_movimentacao: currentMovimentacao.data_movimentacao,
    };

    if (currentMovimentacao.id) {
      await supabase.from('patrimonio_movimentacoes').update(payload).eq('id', currentMovimentacao.id);
    } else {
      await supabase.from('patrimonio_movimentacoes').insert([payload]);
      
      // Update Bem Location if it is a MUDANCA_LOCAL (optional integration, maybe user changes manually)
    }

    setIsEditingMovimentacao(false);
    fetchMovimentacoes();
    setSuccess('Movimentação salva!');
    setTimeout(() => setSuccess(''), 3000);
  };
  
  const handleDeleteMovimentacao = async (id: string) => {
    confirmDelete({
      message: 'Tem certeza que deseja excluir esta movimentação do histórico?',
      onConfirm: async () => {
        await supabase.from('patrimonio_movimentacoes').delete().eq('id', id);
        fetchMovimentacoes();
      }
    });
  };

  // Reports
  const generateReport = () => {
    if (relatorioTipo === 'bens') {
      let filtered = bens;
      if (relatorioLocalizacao) {
        filtered = filtered.filter(b => b.localizacao_id === relatorioLocalizacao);
      }
      setRelatorioResult(filtered);
    } else {
      let filtered = movimentacoes;
      if (relatorioLocalizacao) {
        // Find which items are in this location
        const bensInLoc = bens.filter(b => b.localizacao_id === relatorioLocalizacao).map(b => b.id);
        filtered = filtered.filter(m => bensInLoc.includes(m.patrimonio_id));
      }
      if (relatorioDataInicial) {
        filtered = filtered.filter(m => new Date(m.data_movimentacao) >= new Date(relatorioDataInicial));
      }
      if (relatorioDataFinal) {
        filtered = filtered.filter(m => new Date(m.data_movimentacao) <= new Date(relatorioDataFinal));
      }
      setRelatorioResult(filtered);
    }
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
      {(!isEditingBem && !isEditingCategoria && !isEditingLocal && !isEditingMovimentacao) && (
        <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit">
          <button onClick={() => setActiveTab('dashboard')} className={\`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap \${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}\`}>
            <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Visão Geral</div>
          </button>
          <button onClick={() => setActiveTab('bens')} className={\`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap \${activeTab === 'bens' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}\`}>
            <div className="flex items-center gap-2"><Package className="w-4 h-4" /> Bens e Ativos</div>
          </button>
          {canReadCategorias && (
            <>
              <button onClick={() => setActiveTab('categorias')} className={\`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap \${activeTab === 'categorias' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}\`}>
                <div className="flex items-center gap-2"><Layers className="w-4 h-4" /> Categorias</div>
              </button>
              <button onClick={() => setActiveTab('locais')} className={\`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap \${activeTab === 'locais' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}\`}>
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Localizações</div>
              </button>
              <button onClick={() => setActiveTab('movimentacoes')} className={\`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap \${activeTab === 'movimentacoes' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}\`}>
                <div className="flex items-center gap-2"><History className="w-4 h-4" /> Movimentações</div>
              </button>
              <button onClick={() => setActiveTab('relatorios')} className={\`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap \${activeTab === 'relatorios' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}\`}>
                <div className="flex items-center gap-2"><FileText className="w-4 h-4" /> Relatórios</div>
              </button>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && !isEditingBem && !isEditingCategoria && !isEditingLocal && !isEditingMovimentacao && (
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
          {activeTab === 'bens' && !isEditingBem && (
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
                        estado_conservacao: 'BOM', status: 'ATIVO', categoria_id: '', localizacao_id: '', foto_url: ''
                      });
                      setIsEditingBem(true);
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
                          <div className="flex items-start gap-3">
                            <div className="bg-white p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 cursor-pointer hover:shadow-md transition-all" onClick={() => { setQrBem(bem); setShowQRModal(true); }}>
                              {bem.foto_url ? (
                                <img src={bem.foto_url} alt={bem.nome} className="w-8 h-8 object-cover rounded" />
                              ) : (
                                <QRCodeSVG value={\`patrimonio:\${bem.id}\`} size={32} />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white text-sm">{bem.nome}</p>
                              {bem.valor_aquisicao && (
                                <div className="mt-1 flex flex-col gap-0.5">
                                  <span className="text-xs text-slate-400 line-through">Aq: R$ {parseFloat(bem.valor_aquisicao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  <span className="text-xs font-bold text-amber-600 dark:text-amber-500">
                                    Atual: R$ {calculateDepreciation(parseFloat(bem.valor_aquisicao), bem.data_aquisicao, bem.estado_conservacao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{bem.local?.nome || '-'}</p>
                          <p className="text-xs text-slate-400">{bem.categoria?.nome || '-'}</p>
                        </td>
                        <td className="p-4 text-sm text-slate-500 font-mono">
                          {bem.numero_tombamento || '-'}
                        </td>
                        <td className="p-4">
                          <AnimatePresence mode="popLayout">
                            <motion.button
                              key={bem.status}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.8, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              onClick={() => canEditPatrimonio && handleQuickStatusChange(bem)}
                              disabled={!canEditPatrimonio}
                              className={\`inline-block focus:outline-none \${canEditPatrimonio ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}\`}
                            >
                              <span className={\`px-3 py-1 rounded-full text-xs font-bold inline-block \${
                                bem.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-700' :
                                bem.status === 'EM_MANUTENCAO' ? 'bg-amber-100 text-amber-700' :
                                bem.status === 'BAIXADO' ? 'bg-rose-100 text-rose-700' :
                                'bg-blue-100 text-blue-700'
                              }\`}>
                                {bem.status}
                              </span>
                            </motion.button>
                          </AnimatePresence>
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
                                    setIsEditingBem(true);
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

          {/* FORM: BEM */}
          {isEditingBem && (
            <motion.form 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
              onSubmit={handleSaveBem} 
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                  <button type="button" onClick={() => setIsEditingBem(false)} className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {currentBem.id ? 'Editar Cadastro de Bem' : 'Novo Cadastro de Bem'}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Imagem do Bem */}
                <div className="lg:col-span-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#E4A232]">Foto do Bem</h4>
                </div>
                <div className="lg:col-span-3 flex gap-6 items-start">
                  <div className="w-32 h-32 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden relative group">
                    {currentBem.foto_url ? (
                      <img src={currentBem.foto_url} alt="Prévia" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Sem foto</span>
                      </div>
                    )}
                    <button type="button" onClick={() => document.getElementById('bem-photo-upload')?.click()} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Camera className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div
                      onDragOver={(e) => { e.preventDefault(); if (!isUploading) setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (!isUploading && e.dataTransfer.files.length) handleFileSelection(Array.from(e.dataTransfer.files)); }}
                      onClick={() => !isUploading && document.getElementById('bem-photo-upload')?.click()}
                      className={\`p-4 rounded-xl border-2 border-dashed transition-all duration-200 text-center flex flex-col items-center justify-center gap-2 \${isDragging ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 cursor-pointer' : isUploading ? 'opacity-50 cursor-wait' : 'border-slate-200 dark:border-slate-700 hover:border-amber-500 cursor-pointer'}\`}
                    >
                      <input id="bem-photo-upload" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFileSelection(Array.from(e.target.files))} />
                      <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mb-1">
                        <Camera size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Clique para buscar ou arraste uma foto</p>
                        <p className="text-xs text-slate-500 mt-1">PNG, JPG até 5MB</p>
                      </div>
                    </div>
                    {currentBem.foto_url && (
                      <button type="button" onClick={() => setCurrentBem({ ...currentBem, foto_url: '' })} className="text-xs text-rose-500 font-bold hover:underline">Remover Imagem</button>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-3 border-b border-slate-100 dark:border-slate-800 pb-2 mt-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#E4A232]">I. Identificação do Bem</h4>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome do Bem *</label>
                  <input type="text" required value={currentBem.nome} onChange={(e) => setCurrentBem({ ...currentBem, nome: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nº Tombamento / Plaqueta</label>
                  <input type="text" value={currentBem.numero_tombamento || ''} onChange={(e) => setCurrentBem({ ...currentBem, numero_tombamento: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Categoria *</label>
                  <select required value={currentBem.categoria_id || ''} onChange={(e) => setCurrentBem({ ...currentBem, categoria_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium">
                    <option value="">Selecione...</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Localização</label>
                  <select value={currentBem.localizacao_id || ''} onChange={(e) => setCurrentBem({ ...currentBem, localizacao_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium">
                    <option value="">Selecione...</option>
                    {locais.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Status Atual</label>
                  <select value={currentBem.status} onChange={(e) => setCurrentBem({ ...currentBem, status: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium">
                    <option value="ATIVO">Ativo</option>
                    <option value="EM_MANUTENCAO">Em Manutenção</option>
                    <option value="EMPRESTADO">Emprestado</option>
                    <option value="BAIXADO">Baixado</option>
                  </select>
                </div>

                <div className="lg:col-span-3 border-b border-slate-100 dark:border-slate-800 pb-2 mt-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#E4A232]">II. Valores e Aquisição</h4>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Data da Aquisição</label>
                  <input type="date" value={currentBem.data_aquisicao ? currentBem.data_aquisicao.split('T')[0] : ''} onChange={(e) => setCurrentBem({ ...currentBem, data_aquisicao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Valor Aquisição (R$)</label>
                  <input type="number" step="0.01" value={currentBem.valor_aquisicao || ''} onChange={(e) => setCurrentBem({ ...currentBem, valor_aquisicao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Estado de Conservação</label>
                  <select value={currentBem.estado_conservacao} onChange={(e) => setCurrentBem({ ...currentBem, estado_conservacao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium">
                    <option value="NOVO">Novo</option>
                    <option value="BOM">Bom</option>
                    <option value="REGULAR">Regular</option>
                    <option value="RUIM">Ruim</option>
                    <option value="SUCATA">Sucata</option>
                  </select>
                </div>

                <div className="lg:col-span-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição / Observações</label>
                  <textarea rows={3} value={currentBem.descricao || ''} onChange={(e) => setCurrentBem({ ...currentBem, descricao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>
                
                {/* Auditoria / Log do Patrimônio */}
                {currentBem.id && (
                  <>
                    <div className="lg:col-span-3 border-b border-slate-100 dark:border-slate-800 pb-2 mt-2">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#E4A232]">III. Histórico de Cadastro</h4>
                    </div>
                    <div className="lg:col-span-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-100 dark:border-slate-700">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Criado por</p>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{currentBem.criado_por_nome || 'Sistema'} em {new Date(currentBem.criado_em || currentBem.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Última Atualização por</p>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {currentBem.atualizado_por_nome || 'N/A'} {currentBem.atualizado_em ? \`em \${new Date(currentBem.atualizado_em).toLocaleString('pt-BR')}\` : ''}
                        </p>
                      </div>
                    </div>
                  </>
                )}

              </div>
              <div className="mt-8 flex justify-end gap-4">
                <button type="button" onClick={() => setIsEditingBem(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-2xl shadow-sm flex items-center gap-2"><Save className="w-4 h-4" /> Salvar Cadastro</button>
              </div>
            </motion.form>
          )}

          {/* TAB: CATEGORIAS */}
          {activeTab === 'categorias' && !isEditingCategoria && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Layers className="w-5 h-5 text-amber-500"/> Categorias de Patrimônio</h3>
                {canEditCategorias && (
                  <button
                    onClick={() => {
                      setCurrentCategoria({ nome: '', descricao: '' });
                      setIsEditingCategoria(true);
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
                    <div key={cat.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{cat.nome}</p>
                        {cat.descricao && <p className="text-xs text-slate-500">{cat.descricao}</p>}
                      </div>
                      {canEditCategorias && (
                        <div className="flex gap-2">
                          <button onClick={() => { setCurrentCategoria(cat); setIsEditingCategoria(true); }} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteCategoria(cat.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  ))}
                  {categorias.length === 0 && <p className="text-center text-slate-500 text-sm py-8">Nenhuma categoria cadastrada.</p>}
                </div>
              </div>
            </div>
          )}

          {/* FORM: CATEGORIA */}
          {isEditingCategoria && (
            <motion.form 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
              onSubmit={handleSaveCategoria} 
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 max-w-2xl"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                <button type="button" onClick={() => setIsEditingCategoria(false)} className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {currentCategoria.id ? 'Editar Categoria' : 'Nova Categoria'}
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome da Categoria *</label>
                  <input required type="text" value={currentCategoria.nome} onChange={(e) => setCurrentCategoria({ ...currentCategoria, nome: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição</label>
                  <textarea rows={3} value={currentCategoria.descricao || ''} onChange={(e) => setCurrentCategoria({ ...currentCategoria, descricao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-4">
                <button type="button" onClick={() => setIsEditingCategoria(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-2xl shadow-sm flex items-center gap-2"><Save className="w-4 h-4" /> Salvar</button>
              </div>
            </motion.form>
          )}

          {/* TAB: LOCAIS */}
          {activeTab === 'locais' && !isEditingLocal && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><MapPin className="w-5 h-5 text-amber-500"/> Localizações Físicas</h3>
                {canEditCategorias && (
                  <button
                    onClick={() => {
                      setCurrentLocal({ nome: '', descricao: '' });
                      setIsEditingLocal(true);
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
                    <div key={loc.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{loc.nome}</p>
                        {loc.descricao && <p className="text-xs text-slate-500">{loc.descricao}</p>}
                      </div>
                      {canEditCategorias && (
                        <div className="flex gap-2">
                          <button onClick={() => { setCurrentLocal(loc); setIsEditingLocal(true); }} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteLocal(loc.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  ))}
                  {locais.length === 0 && <p className="text-center text-slate-500 text-sm py-8">Nenhum local cadastrado.</p>}
                </div>
              </div>
            </div>
          )}

          {/* FORM: LOCAL */}
          {isEditingLocal && (
            <motion.form 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
              onSubmit={handleSaveLocal} 
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 max-w-2xl"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                <button type="button" onClick={() => setIsEditingLocal(false)} className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {currentLocal.id ? 'Editar Local' : 'Novo Local'}
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome do Local *</label>
                  <input required type="text" value={currentLocal.nome} onChange={(e) => setCurrentLocal({ ...currentLocal, nome: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição</label>
                  <textarea rows={3} value={currentLocal.descricao || ''} onChange={(e) => setCurrentLocal({ ...currentLocal, descricao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-4">
                <button type="button" onClick={() => setIsEditingLocal(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-2xl shadow-sm flex items-center gap-2"><Save className="w-4 h-4" /> Salvar</button>
              </div>
            </motion.form>
          )}

          {/* TAB: MOVIMENTAÇÕES */}
          {activeTab === 'movimentacoes' && !isEditingMovimentacao && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-amber-500"/> Histórico de Movimentações</h3>
                {canEditPatrimonio && (
                  <button
                    onClick={() => {
                      setCurrentMovimentacao({ patrimonio_id: '', tipo_movimentacao: 'MUDANCA_LOCAL', responsavel: user?.nome || '', observacao: '', data_movimentacao: new Date().toISOString().split('T')[0] });
                      setIsEditingMovimentacao(true);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Registrar Movimentação
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Data</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Bem</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Tipo</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Responsável</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {movimentacoes.map(mov => (
                      <tr key={mov.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 text-sm font-medium text-slate-900 dark:text-white">
                          {new Date(mov.data_movimentacao).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-4 font-bold text-slate-900 dark:text-white text-sm">
                          {mov.bem?.nome || '-'}
                        </td>
                        <td className="p-4">
                          <span className={\`px-3 py-1 rounded-full text-xs font-bold \${
                            mov.tipo_movimentacao === 'AQUISICAO' ? 'bg-emerald-100 text-emerald-700' :
                            mov.tipo_movimentacao === 'MUDANCA_LOCAL' ? 'bg-blue-100 text-blue-700' :
                            mov.tipo_movimentacao === 'MANUTENCAO' ? 'bg-amber-100 text-amber-700' :
                            mov.tipo_movimentacao === 'EMPRESTIMO' ? 'bg-purple-100 text-purple-700' :
                            'bg-slate-100 text-slate-700'
                          }\`}>
                            {mov.tipo_movimentacao}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                          {mov.responsavel}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canEditPatrimonio && (
                              <button
                                onClick={() => handleDeleteMovimentacao(mov.id)}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {movimentacoes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">Nenhuma movimentação registrada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FORM: MOVIMENTAÇÃO */}
          {isEditingMovimentacao && (
            <motion.form 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
              onSubmit={handleSaveMovimentacao} 
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 max-w-3xl"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                <button type="button" onClick={() => setIsEditingMovimentacao(false)} className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Registrar Movimentação
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Bem Patrimonial *</label>
                  <select required value={currentMovimentacao.patrimonio_id} onChange={(e) => setCurrentMovimentacao({ ...currentMovimentacao, patrimonio_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium">
                    <option value="">Selecione um bem...</option>
                    {bens.map(b => <option key={b.id} value={b.id}>{b.nome} {b.numero_tombamento ? \`(\${b.numero_tombamento})\` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tipo de Movimentação *</label>
                  <select required value={currentMovimentacao.tipo_movimentacao} onChange={(e) => setCurrentMovimentacao({ ...currentMovimentacao, tipo_movimentacao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium">
                    <option value="MUDANCA_LOCAL">Mudança de Local</option>
                    <option value="EMPRESTIMO">Empréstimo</option>
                    <option value="DEVOLUCAO">Devolução</option>
                    <option value="MANUTENCAO">Envio p/ Manutenção</option>
                    <option value="BAIXA">Baixa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Data *</label>
                  <input required type="date" value={currentMovimentacao.data_movimentacao} onChange={(e) => setCurrentMovimentacao({ ...currentMovimentacao, data_movimentacao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Responsável *</label>
                  <input required type="text" value={currentMovimentacao.responsavel} onChange={(e) => setCurrentMovimentacao({ ...currentMovimentacao, responsavel: e.target.value })} placeholder="Nome da pessoa responsável pela movimentação" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Observações</label>
                  <textarea rows={3} value={currentMovimentacao.observacao || ''} onChange={(e) => setCurrentMovimentacao({ ...currentMovimentacao, observacao: e.target.value })} placeholder="Destino, motivo do empréstimo, detalhes do defeito, etc." className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-4">
                <button type="button" onClick={() => setIsEditingMovimentacao(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-2xl shadow-sm flex items-center gap-2"><Save className="w-4 h-4" /> Registrar</button>
              </div>
            </motion.form>
          )}

          {/* TAB: RELATÓRIOS */}
          {activeTab === 'relatorios' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6"><FileText className="w-5 h-5 text-amber-500"/> Relatórios de Patrimônio</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tipo de Relatório</label>
                    <select value={relatorioTipo} onChange={(e) => { setRelatorioTipo(e.target.value as any); setRelatorioResult(null); }} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium">
                      <option value="bens">Bens Patrimoniais</option>
                      <option value="movimentacoes">Bens Movimentados</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Filtro: Localização</label>
                    <select value={relatorioLocalizacao} onChange={(e) => setRelatorioLocalizacao(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium">
                      <option value="">Todas</option>
                      {locais.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  
                  {relatorioTipo === 'movimentacoes' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Data Inicial</label>
                        <input type="date" value={relatorioDataInicial} onChange={(e) => setRelatorioDataInicial(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Data Final</label>
                        <input type="date" value={relatorioDataFinal} onChange={(e) => setRelatorioDataFinal(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                      </div>
                    </>
                  )}
                  
                  <div className={relatorioTipo === 'bens' ? 'md:col-span-2' : ''}>
                    <button onClick={generateReport} className="w-full px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow-sm transition-all flex justify-center items-center gap-2">
                      <Search className="w-4 h-4" /> Gerar Relatório
                    </button>
                  </div>
                </div>
              </div>
              
              {relatorioResult && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Resultado ({relatorioResult.length} registros)</h4>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg flex items-center gap-2 print:hidden"><Download className="w-3 h-3"/> Imprimir / PDF</button>
                  </div>
                  
                  <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-left border-collapse print:text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                          {relatorioTipo === 'bens' ? (
                            <>
                              <th className="p-3 text-xs font-black text-slate-500 uppercase tracking-wider">Nome do Bem</th>
                              <th className="p-3 text-xs font-black text-slate-500 uppercase tracking-wider">Tombamento</th>
                              <th className="p-3 text-xs font-black text-slate-500 uppercase tracking-wider">Local / Categoria</th>
                              <th className="p-3 text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                            </>
                          ) : (
                            <>
                              <th className="p-3 text-xs font-black text-slate-500 uppercase tracking-wider">Data</th>
                              <th className="p-3 text-xs font-black text-slate-500 uppercase tracking-wider">Bem</th>
                              <th className="p-3 text-xs font-black text-slate-500 uppercase tracking-wider">Tipo</th>
                              <th className="p-3 text-xs font-black text-slate-500 uppercase tracking-wider">Responsável</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {relatorioResult.map((item, idx) => (
                          <tr key={item.id || idx}>
                            {relatorioTipo === 'bens' ? (
                              <>
                                <td className="p-3 font-bold text-slate-900 dark:text-white text-sm">{item.nome}</td>
                                <td className="p-3 text-sm text-slate-500 font-mono">{item.numero_tombamento || '-'}</td>
                                <td className="p-3 text-sm text-slate-600 dark:text-slate-300">{item.local?.nome || '-'} / {item.categoria?.nome || '-'}</td>
                                <td className="p-3 text-xs font-bold">{item.status}</td>
                              </>
                            ) : (
                              <>
                                <td className="p-3 text-sm">{new Date(item.data_movimentacao).toLocaleDateString('pt-BR')}</td>
                                <td className="p-3 font-bold text-slate-900 dark:text-white text-sm">{item.bem?.nome || '-'}</td>
                                <td className="p-3 text-sm">{item.tipo_movimentacao}</td>
                                <td className="p-3 text-sm text-slate-600 dark:text-slate-300">{item.responsavel}</td>
                              </>
                            )}
                          </tr>
                        ))}
                        {relatorioResult.length === 0 && (
                          <tr><td colSpan={4} className="p-6 text-center text-slate-500">Nenhum resultado encontrado para os filtros.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* MODAL: QR CODE */}
      {showQRModal && qrBem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowQRModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-8 text-center space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{qrBem.nome}</h3>
            <div className="bg-white p-4 rounded-2xl inline-block shadow-sm">
              <QRCodeSVG value={\`patrimonio:\${qrBem.id}\`} size={200} />
            </div>
            <p className="text-xs text-slate-500 font-mono">{qrBem.numero_tombamento || 'S/N'}</p>
            <button onClick={() => setShowQRModal(false)} className="w-full px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl">Fechar</button>
          </div>
        </div>
      )}

    </div>
  );
}
`;

fs.writeFileSync('app/(dashboard)/patrimonio/page.tsx', content);
console.log('Success');
