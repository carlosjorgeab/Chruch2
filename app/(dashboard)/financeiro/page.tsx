'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useIgreja } from '@/context/IgrejaContext';
import { useAuth } from '@/context/AuthContext';
import { 
  Plus, Trash2, TrendingUp, TrendingDown, Wallet, Calendar, Tag, RefreshCw, 
  Save, X, DollarSign, Upload, File, FileText, Check, AlertCircle, Link2, Settings, Briefcase, Landmark, Edit2
} from 'lucide-react';
import dynamic from 'next/dynamic';

const FinancialChart = dynamic(() => import('@/components/FinancialChart'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-[#94a3b8] text-xs">Carregando gráfico...</div>
});

type Transacao = {
  id: string;
  id_igreja: string;
  tipo: 'Entrada' | 'Saída';
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  membro_contribuinte?: string;
  
  // New upgraded schema fields
  id_forma_pagamento?: string | null;
  id_conta?: string | null;
  id_fornecedor?: string | null;
  data_vencimento?: string | null;
  data_pagamento?: string | null;
};

type Conta = {
  id: string;
  nome: string;
  banco: string | null;
  agencia: string | null;
  conta_corrente: string | null;
};

type Categoria = {
  id: string;
  nome: string;
  tipo: 'Crédito' | 'Débito';
};

type FormaPagamento = {
  id: string;
  nome: string;
};

type ArquivoAnexo = {
  id?: string;
  nome_arquivo: string;
  url_arquivo: string;
};

export default function FinanceiroPage() {
  const { user, hasPermission } = useAuth();
  const { selectedIgreja } = useIgreja();
  const [activeTab, setActiveTab] = useState<'lancamentos' | 'contas' | 'categorias' | 'formas_pagamento' | 'fluxo_caixa'>('lancamentos');
  
  // Transactions data states
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [membros, setMembros] = useState<{ id: string; nome: string }[]>([]);

  // Submodules list database states
  const [dbCategorias, setDbCategorias] = useState<Categoria[]>([]);
  const [dbFormasPagamento, setDbFormasPagamento] = useState<FormaPagamento[]>([]);
  const [dbContas, setDbContas] = useState<Conta[]>([]);
  const [dbFornecedores, setDbFornecedores] = useState<any[]>([]);

  // New submodules edit states
  const [editingConta, setEditingConta] = useState<Partial<Conta> | null>(null);
  const [editingCategoria, setEditingCategoria] = useState<Partial<Categoria> | null>(null);
  const [editingForma, setEditingForma] = useState<Partial<FormaPagamento> | null>(null);

  // Form entries for upgraded transactions
  const [currentTransacao, setCurrentTransacao] = useState<Partial<Transacao>>({
    tipo: 'Entrada',
    categoria: '',
    descricao: '',
    valor: 0,
    data: '',
    membro_contribuinte: '',
    id_forma_pagamento: '',
    id_conta: '',
    id_fornecedor: '',
    data_vencimento: '',
    data_pagamento: ''
  });

  // Attachments state
  const [anexos, setAnexos] = useState<ArquivoAnexo[]>([]);
  const [novoAnexoNome, setNovoAnexoNome] = useState('');
  const [novoAnexoUrl, setNovoAnexoUrl] = useState('');
  const [showAnexosForm, setShowAnexosForm] = useState(false);
  const [activeTransacaoAnexos, setActiveTransacaoAnexos] = useState<ArquivoAnexo[]>([]);
  const [selectedTransacaoForAnexos, setSelectedTransacaoForAnexos] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auxiliary loaders
  const loadSubmodulesData = async () => {
    if (!selectedIgreja) return;
    try {
      // 1. Fetch Categorias
      const { data: catData } = await supabase
        .from('categorias')
        .select('*')
        .eq('id_igreja', selectedIgreja.id)
        .order('nome');
      if (catData) setDbCategorias(catData);

      // 2. Fetch Formas Pagamento
      const { data: formData } = await supabase
        .from('forma_pagamento')
        .select('*')
        .eq('id_igreja', selectedIgreja.id)
        .order('nome');
      if (formData) setDbFormasPagamento(formData);

      // 3. Fetch Contas
      const { data: contData } = await supabase
        .from('contas')
        .select('*')
        .eq('id_igreja', selectedIgreja.id)
        .order('nome');
      if (contData) setDbContas(contData);

      // 4. Fetch Fornecedores
      const { data: fornData } = await supabase
        .from('fornecedor')
        .select('*')
        .eq('id_igreja', selectedIgreja.id)
        .order('razao_social');
      if (fornData) setDbFornecedores(fornData || []);
    } catch (e) {
      console.error('Error fetching submodules data:', e);
    }
  };

  const fetchTransacoes = async () => {
    if (!selectedIgreja) return;
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('transacoes')
        .select('*')
        .eq('id_igreja', selectedIgreja.id)
        .order('data', { ascending: false });

      if (err) {
        if (err.code === 'PGRST205') {
          console.warn('Tabela transacoes não encontrada.');
          setTransacoes([]);
        } else {
          console.error(err);
        }
      } else if (data) {
        setTransacoes(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Load everything on church change
  useEffect(() => {
    if (selectedIgreja) {
      fetchTransacoes();
      loadSubmodulesData();
      
      // Fetch members for contributors list
      const fetchMembros = async () => {
        try {
          const { data } = await supabase
            .from('membros')
            .select('id, nome')
            .eq('id_igreja', selectedIgreja.id)
            .order('nome', { ascending: true });
          if (data) {
            setMembros(data);
          }
        } catch (e) {
          console.error(e);
        }
      };
      
      fetchMembros();
    } else {
      setTransacoes([]);
      setLoading(false);
    }
  }, [selectedIgreja]);

  // Load registered attachments for a specific transaction
  const loadAttachmentsForTransacao = async (transacaoId: string) => {
    try {
      setSelectedTransacaoForAnexos(transacaoId);
      const { data, error } = await supabase
        .from('arquivos_transacao')
        .select('*')
        .eq('id_transacao', transacaoId);
      if (data) {
        setActiveTransacaoAnexos(data);
      } else {
        setActiveTransacaoAnexos([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover este lançamento financeiro?')) {
      return;
    }
    try {
      // First delete associated attachments
      await supabase.from('arquivos_transacao').delete().eq('id_transacao', id);

      const { error: err } = await supabase.from('transacoes').delete().eq('id', id);
      if (err) throw err;
      const updated = transacoes.filter((t) => t.id !== id);
      setTransacoes(updated);
      setSuccess('Lançamento removido com sucesso!');
    } catch (e: any) {
      setError('Erro ao excluir transação: ' + (e.message || e));
    }
  };

  const handleEdit = async (transacao: Transacao) => {
    setCurrentTransacao({
      ...transacao,
      data: transacao.data || '',
      membro_contribuinte: transacao.membro_contribuinte || '',
      id_forma_pagamento: transacao.id_forma_pagamento || '',
      id_conta: transacao.id_conta || '',
      id_fornecedor: transacao.id_fornecedor || '',
      data_vencimento: transacao.data_vencimento || '',
      data_pagamento: transacao.data_pagamento || ''
    });

    // Load attachments from database for this transaction to allow editing
    try {
      const { data } = await supabase
        .from('arquivos_transacao')
        .select('*')
        .eq('id_transacao', transacao.id);
      if (data) {
        setAnexos(data);
      } else {
        setAnexos([]);
      }
    } catch (e) {
      setAnexos([]);
    }

    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleNew = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Choose initial category from DB if available, fallback otherwise
    const initialCategory = currentTransacao.tipo === 'Entrada'
      ? (dbCategorias.find(c => c.tipo === 'Crédito')?.nome || 'Dízimo')
      : (dbCategorias.find(c => c.tipo === 'Débito')?.nome || 'Aluguel');

    setCurrentTransacao({
      tipo: 'Entrada',
      categoria: initialCategory,
      descricao: '',
      valor: 0,
      data: todayStr,
      membro_contribuinte: '',
      id_forma_pagamento: dbFormasPagamento[0]?.id || '',
      id_conta: dbContas[0]?.id || '',
      id_fornecedor: '',
      data_vencimento: '',
      data_pagamento: ''
    });
    setAnexos([]);
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedIgreja) {
      setError('Selecione uma congregação.');
      return;
    }

    if (!currentTransacao.descricao) {
      setError('A descrição é obrigatória.');
      return;
    }

    const valorNum = Number(currentTransacao.valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      setError('Digite um valor numérico válido maior que zero.');
      return;
    }

    // Default category choice if none selected
    let chosenCat = currentTransacao.categoria;
    if (!chosenCat) {
      if (currentTransacao.tipo === 'Entrada') {
        chosenCat = dbCategorias.find(c => c.tipo === 'Crédito')?.nome || 'Dízimo';
      } else {
        chosenCat = dbCategorias.find(c => c.tipo === 'Débito')?.nome || 'Aluguel';
      }
    }

    const payload: any = {
      id_igreja: selectedIgreja.id,
      tipo: currentTransacao.tipo || 'Entrada',
      categoria: chosenCat,
      descricao: currentTransacao.descricao,
      valor: valorNum,
      data: currentTransacao.data || new Date().toISOString().split('T')[0],
      membro_contribuinte: currentTransacao.membro_contribuinte || null,
      
      // Upgraded attributes
      id_forma_pagamento: currentTransacao.tipo === 'Saída' ? (currentTransacao.id_forma_pagamento || null) : null,
      id_conta: currentTransacao.id_conta || null,
      id_fornecedor: currentTransacao.id_fornecedor || null,
      data_vencimento: currentTransacao.data_vencimento || null,
      data_pagamento: currentTransacao.data_pagamento || null,
    };

    try {
      let savedTransacaoId = currentTransacao.id;

      if (currentTransacao.id) {
        const { error: err } = await supabase
          .from('transacoes')
          .update(payload)
          .eq('id', currentTransacao.id);
        if (err) throw err;
      } else {
        // Insert and grab ID
        const { data: insertedData, error: err } = await supabase
          .from('transacoes')
          .insert(payload)
          .select()
          .single();
        if (err) throw err;
        if (insertedData) {
          savedTransacaoId = insertedData.id;
        }
      }

      // Handle storing files/attachments in support table 'arquivos_transacao'
      if (savedTransacaoId) {
        // First delete stale attachments for this transaction to allow rewrite/overriding
        await supabase.from('arquivos_transacao').delete().eq('id_transacao', savedTransacaoId);
        
        if (anexos.length > 0) {
          const filesPayload = anexos.map(anexo => ({
            id_transacao: savedTransacaoId,
            nome_arquivo: anexo.nome_arquivo,
            url_arquivo: anexo.url_arquivo
          }));
          await supabase.from('arquivos_transacao').insert(filesPayload);
        }
      }

      setSuccess('Lançamento financeiro registrado com sucesso!');
      setIsEditing(false);
      fetchTransacoes();
    } catch (e: any) {
      console.error(e);
      setError('Erro ao salvar no banco: ' + (e.message || e));
    }
  };

  const handleTipoChange = (newTipo: 'Entrada' | 'Saída') => {
    // Attempt dynamic categories from database
    const dynamicCats = dbCategorias.filter(c => c.tipo === (newTipo === 'Entrada' ? 'Crédito' : 'Débito'));
    const initialCategory = dynamicCats.length > 0 ? dynamicCats[0].nome : (newTipo === 'Entrada' ? 'Dízimo' : 'Aluguel');

    setCurrentTransacao(prev => ({
      ...prev,
      tipo: newTipo,
      categoria: initialCategory,
      membro_contribuinte: '',
      id_fornecedor: ''
    }));
  };

  // Add attachment to form list
  const handleAdicionarAnexo = () => {
    if (!novoAnexoNome || !novoAnexoUrl) {
      alert('Por favor, informe um nome descritivo e uma URL para o arquivo.');
      return;
    }
    setAnexos(prev => [...prev, { nome_arquivo: novoAnexoNome, url_arquivo: novoAnexoUrl }]);
    setNovoAnexoNome('');
    setNovoAnexoUrl('');
    setShowAnexosForm(false);
  };

  const handleRemoverAnexo = (index: number) => {
    setAnexos(prev => prev.filter((_, i) => i !== index));
  };

  // Submodule accounts (contas) CRUD Actions
  const handleSaveConta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConta?.nome || !selectedIgreja) return;
    try {
      const payload = {
        id_igreja: selectedIgreja.id,
        nome: editingConta.nome,
        banco: editingConta.banco || null,
        agencia: editingConta.agencia || null,
        conta_corrente: editingConta.conta_corrente || null
      };

      if (editingConta.id) {
        await supabase.from('contas').update(payload).eq('id', editingConta.id);
      } else {
        await supabase.from('contas').insert([payload]);
      }
      setEditingConta(null);
      loadSubmodulesData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteConta = async (id: string) => {
    if (!confirm('Deseja realmente remover esta conta?')) return;
    try {
      await supabase.from('contas').delete().eq('id', id);
      loadSubmodulesData();
    } catch (err) {
      console.error(err);
    }
  };

  // Submodule categories CRUD Actions
  const handleSaveCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategoria?.nome || !selectedIgreja) return;
    try {
      const payload = {
        id_igreja: selectedIgreja.id,
        nome: editingCategoria.nome,
        tipo: editingCategoria.tipo || 'Crédito'
      };

      if (editingCategoria.id) {
        await supabase.from('categorias').update(payload).eq('id', editingCategoria.id);
      } else {
        await supabase.from('categorias').insert([payload]);
      }
      setEditingCategoria(null);
      loadSubmodulesData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCategoria = async (id: string) => {
    if (!confirm('Deseja realmente remover esta categoria?')) return;
    try {
      await supabase.from('categorias').delete().eq('id', id);
      loadSubmodulesData();
    } catch (err) {
      console.error(err);
    }
  };

  // Submodule payment methods CRUD Actions
  const handleSaveForma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingForma?.nome || !selectedIgreja) return;
    try {
      const payload = { 
        id_igreja: selectedIgreja.id,
        nome: editingForma.nome 
      };
      let saveError = null;

      if (editingForma.id) {
        const { error: err } = await supabase.from('forma_pagamento').update(payload).eq('id', editingForma.id);
        saveError = err;
      } else {
        const { error: err } = await supabase.from('forma_pagamento').insert([payload]);
        saveError = err;
      }

      if (saveError) {
        alert('Erro ao salvar forma de pagamento.');
      } else {
        setEditingForma(null);
        loadSubmodulesData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteForma = async (id: string) => {
    if (!confirm('Deseja realmente remover esta forma de pagamento?')) return;
    try {
      const { error: err } = await supabase.from('forma_pagamento').delete().eq('id', id);
      if (err) throw err;
      loadSubmodulesData();
    } catch (err) {
      console.error(err);
    }
  };

  // Balances calculation
  const totalEntradas = transacoes
    .filter((t) => t.tipo === 'Entrada')
    .reduce((sum, t) => sum + t.valor, 0);

  const totalSaidas = transacoes
    .filter((t) => t.tipo === 'Saída')
    .reduce((sum, t) => sum + t.valor, 0);

  const saldoTotal = totalEntradas - totalSaidas;

  // Chart data computation
  const dataMap: Record<string, { Entrada: number; Saída: number }> = {};
  transacoes.forEach((t) => {
    const d = t.data ? t.data.substring(5, 10) : 'Geral'; // MM-DD format
    if (!dataMap[d]) {
      dataMap[d] = { Entrada: 0, Saída: 0 };
    }
    dataMap[d][t.tipo] += t.valor;
  });

  const chartData = Object.entries(dataMap)
    .map(([data, values]) => ({
      data: data.replace('-', '/'),
      ...values,
    }))
    .reverse()
    .slice(-8); // Get latest 8 active days;

  if (!user?.is_admin && !hasPermission('/financeiro')) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center py-20">
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-3xl p-12 shadow-sm space-y-4 max-w-xl mx-auto">
          <div className="p-4 bg-red-100 dark:bg-red-900/40 rounded-full w-16 h-16 flex items-center justify-center mx-auto text-red-650">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-850 dark:text-white">Acesso Negado</h3>
          <p className="text-sm text-slate-550 dark:text-slate-400 leading-relaxed">
            Você não possui permissão para acessar a Gestão Financeira. Entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-1">Módulo Financeiro</p>
          <h2 className="text-3xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">Finanças Integradas</h2>
          <p className="text-slate-500 text-sm">
            Caixa geral, contas bancárias, categorias e comprovantes anexos
          </p>
        </div>

        {/* Tab Selector */}
        {!isEditing && (
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('lancamentos')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'lancamentos' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Lançamentos
            </button>
            {(user?.is_admin || hasPermission('/financeiro') || hasPermission('/financeiro/fluxo_caixa')) && (
              <button
                onClick={() => setActiveTab('fluxo_caixa')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'fluxo_caixa' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Fluxo de Caixa
              </button>
            )}
            {(user?.is_admin || hasPermission('/financeiro/contas')) && (
              <button
                onClick={() => setActiveTab('contas')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'contas' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Contas
              </button>
            )}
            {(user?.is_admin || hasPermission('/financeiro/categorias')) && (
              <button
                onClick={() => setActiveTab('categorias')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'categorias' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Categorias
              </button>
            )}
            {(user?.is_admin || hasPermission('/financeiro/formas_pagamento')) && (
              <button
                onClick={() => setActiveTab('formas_pagamento')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'formas_pagamento' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Formas de Pagamento
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 font-bold text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 font-bold text-sm flex items-center gap-2">
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* RENDER ACTIVE TAB VIEW */}

      {activeTab === 'lancamentos' && (
        <>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-700 pb-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {currentTransacao.id ? 'Editar Lançamento Financeiro' : 'Sinalizar Novo Lançamento Financeiro'}
                </h3>
                <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Tipo de Transação *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleTipoChange('Entrada')}
                      className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider border-2 transition-all ${
                        currentTransacao.tipo === 'Entrada'
                          ? 'bg-green-100 text-green-850 border-green-500 shadow-sm'
                          : 'border-slate-100 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      Crédito (Entrada)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTipoChange('Saída')}
                      className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider border-2 transition-all ${
                        currentTransacao.tipo === 'Saída'
                          ? 'bg-red-50 text-red-775 border-red-500 shadow-sm'
                          : 'border-slate-100 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      Débito (Saída)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Categoria do Lançamento *
                  </label>
                  <select
                    value={currentTransacao.categoria || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, categoria: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                    required
                  >
                    <option value="" disabled>Selecione uma categoria</option>
                    {dbCategorias.filter(c => c.tipo === (currentTransacao.tipo === 'Entrada' ? 'Crédito' : 'Débito')).length > 0 ? (
                      dbCategorias
                        .filter(c => c.tipo === (currentTransacao.tipo === 'Entrada' ? 'Crédito' : 'Débito'))
                        .map(c => (
                          <option key={c.id} value={c.nome}>{c.nome}</option>
                        ))
                    ) : (
                      // Fallback categories if empty
                      currentTransacao.tipo === 'Entrada' ? (
                        <>
                          <option value="Dízimo">Dízimo Ordinário</option>
                          <option value="Oferta">Oferta Voluntária</option>
                          <option value="Doação">Doação Externa</option>
                          <option value="Evento">Arrecadação de Evento</option>
                          <option value="Outros">Outras Entradas</option>
                        </>
                      ) : (
                        <>
                          <option value="Aluguel">Aluguel do Salão</option>
                          <option value="Energia">Água e Energia</option>
                          <option value="Som e Luz">Equipamentos Som / Luz</option>
                          <option value="Eventos">Ajuda de Custo Eventos</option>
                          <option value="Manutenção">Manutenção Predial</option>
                          <option value="Missionário">Apoio Missionário</option>
                          <option value="Outros">Outras Despesas</option>
                        </>
                      )
                    )}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Descrição ou Observações *
                  </label>
                  <input
                    type="text"
                    required
                    value={currentTransacao.descricao || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, descricao: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold shadow-inner"
                    placeholder="Ex. Pagamento fatura de serviços, compra insumos"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Valor do Lançamento (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={currentTransacao.valor || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, valor: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-black text-lg"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Conta Bancária Associada *
                  </label>
                  <select
                    value={currentTransacao.id_conta || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, id_conta: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                  >
                    <option value="">Selecione uma conta</option>
                    {dbContas.map(conta => (
                      <option key={conta.id} value={conta.id}>{conta.nome} {conta.banco ? `(${conta.banco})` : ''}</option>
                    ))}
                    {dbContas.length === 0 && (
                      <>
                        <option value="principal">Caixa Principal Geral</option>
                        <option value="secundario">Conta Corrente de Apoio</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Data do Documento
                  </label>
                  <input
                    type="date"
                    required
                    value={currentTransacao.data || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, data: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={currentTransacao.data_vencimento || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, data_vencimento: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    {currentTransacao.tipo === 'Saída' ? 'Data de Pagamento (Quitação)' : 'Data de Recebimento (Quitação)'}
                  </label>
                  <input
                    type="date"
                    value={currentTransacao.data_pagamento || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, data_pagamento: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                  />
                </div>

                {/* Conditional payments methods combo: ONLY display when type is "Saída/Débito" */}
                {currentTransacao.tipo === 'Saída' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                      Forma de Pagamento (Débito)*
                    </label>
                    <select
                      value={currentTransacao.id_forma_pagamento || ''}
                      onChange={(e) => setCurrentTransacao({ ...currentTransacao, id_forma_pagamento: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold animate-in fade-in duration-200"
                    >
                      <option value="">Selecione forma de pagamento</option>
                      {dbFormasPagamento.map(forma => (
                        <option key={forma.id} value={forma.id}>{forma.nome}</option>
                      ))}
                      {dbFormasPagamento.length === 0 && (
                        <>
                          <option value="Dinheiro">Dinheiro vivo</option>
                          <option value="PIX">PIX instantâneo</option>
                          <option value="Transferência">TED / DOC</option>
                          <option value="Cartão">Cartão de Crédito/Débito</option>
                        </>
                      )}
                    </select>
                  </div>
                )}

                {/* Cliente/Fornecedor Selector based on transaction type (Clent if Entrada, Supplier if Saída) */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    {currentTransacao.tipo === 'Entrada' ? 'Cliente / Doadores Estrela' : 'Fornecedor Credor *'}
                  </label>
                  <select
                    value={currentTransacao.id_fornecedor || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, id_fornecedor: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                  >
                    <option value="">Selecione um {currentTransacao.tipo === 'Entrada' ? 'Cliente' : 'Fornecedor'}</option>
                    {dbFornecedores.map(forn => (
                      <option key={forn.id} value={forn.id}>{forn.razao_social} {forn.cpf_cnpj ? `(${forn.cpf_cnpj})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Contribuição Nominal de Membro (Caso aplicável - Opcional)
                  </label>
                  <select
                    value={currentTransacao.membro_contribuinte || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, membro_contribuinte: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                  >
                    <option value="">Anônimo / Contribuição Coletiva</option>
                    {membros.map((m) => (
                      <option key={m.id} value={m.nome}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SUPPORT FILE UPLOAD SYSTEM (arquivos_transacao storage) */}
                <div className="md:col-span-2 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                        <Upload size={14} className="text-amber-500" />
                        Comprovantes & Anexos Financeiros
                      </h4>
                      <p className="text-[11px] text-slate-450 mt-0.5">Vincule comprovantes, faturas ou contratos a este lançamento</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAnexosForm(!showAnexosForm)}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors"
                    >
                      {showAnexosForm ? 'Esconder Formulário' : 'Adicionar Anexo URL'}
                    </button>
                  </div>

                  {showAnexosForm && (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Título do Documento</label>
                          <input
                            type="text"
                            value={novoAnexoNome}
                            onChange={(e) => setNovoAnexoNome(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                            placeholder="Ex: Recibo de Luz.pdf"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">URL Completa / Caminho do Arquivo</label>
                          <input
                            type="text"
                            value={novoAnexoUrl}
                            onChange={(e) => setNovoAnexoUrl(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                            placeholder="https://servidor.com/recibo.pdf"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            // Quick simulation generator helper if empty
                            setNovoAnexoNome(`Comprovante_${Math.floor(1000 + Math.random() * 9000)}.pdf`);
                            setNovoAnexoUrl(`https://churchdocs.net/mock-upload/recibo-${Date.now()}.png`);
                          }}
                          className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-300 font-bold text-[10px] rounded"
                        >
                          Simular Gerar Mock URL
                        </button>
                        <button
                          type="button"
                          onClick={handleAdicionarAnexo}
                          className="px-4 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded"
                        >
                          Confirmar Inserção
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Attached files items tree list */}
                  {anexos.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-2">Sem anexos registrados para esta transação.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {anexos.map((anexo, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs">
                          <div className="flex items-center gap-2 max-w-[80%]">
                            <FileText size={16} className="text-amber-500 flex-shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{anexo.nome_arquivo}</p>
                              <a href={anexo.url_arquivo} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline hover:text-blue-600 font-normal leading-none inline-flex items-center gap-0.5">
                                Ver link arquivo
                                <Link2 size={10} />
                              </a>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoverAnexo(idx)}
                            className="p-1 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all uppercase text-xs tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-amber-600 text-white px-8 py-3 rounded-xl font-black transition-all shadow-md hover:bg-amber-700 uppercase text-xs tracking-widest"
                >
                  <Save size={16} />
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Bento-grid of balances */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Receitas</span>
                    <p className="text-3xl font-black text-black dark:text-white">R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="w-12 h-12 bg-transparent text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center">
                    <TrendingUp size={24} />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Despesas</span>
                    <p className="text-3xl font-black text-black dark:text-white">R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="w-12 h-12 bg-transparent text-red-500 dark:text-red-400 rounded-2xl flex items-center justify-center">
                    <TrendingDown size={24} />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Saldo Consolidado</span>
                    <p className="text-3xl font-black text-black dark:text-white">R$ {saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="w-12 h-12 bg-transparent text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                    <Wallet size={24} />
                  </div>
                </div>
              </div>

              {/* Action Button Trigger */}
              <div className="flex justify-end pr-1">
                <button
                  onClick={handleNew}
                  disabled={!selectedIgreja}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-md transition active:scale-95 text-xs uppercase tracking-wider"
                >
                  <Plus size={18} />
                  Novo Lançamento
                </button>
              </div>

              {/* Modal showing attachments on transaction list row click */}
              {selectedTransacaoForAnexos && (
                <div className="bg-amber-500/5 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-2xl p-5 mb-4 animate-in fade-in duration-250">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-amber-500/10">
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <File size={16} />
                      Anexos Vinculados à Transação
                    </span>
                    <button
                      onClick={() => setSelectedTransacaoForAnexos(null)}
                      className="text-slate-400 hover:text-slate-650"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {activeTransacaoAnexos.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Nenhum arquivo de apoio anexado a esse lançamento financeiro.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {activeTransacaoAnexos.map((anexo) => (
                        <div key={anexo.id} className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800 shadow-3xs">
                          <FileText size={20} className="text-amber-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-850 dark:text-white truncate">{anexo.nome_arquivo}</p>
                            <a
                              href={anexo.url_arquivo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-blue-500 underline flex items-center gap-0.5 mt-0.5 font-semibold"
                            >
                              Ver Comprovante
                              <Link2 size={10} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Table list of transactions */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Histórico de Lançamentos</span>
                </div>

                {loading ? (
                  <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin" />
                    Carregando histórico financeiro...
                  </div>
                ) : transacoes.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 italic">
                    Nenhuma transação financeira registrada neste caixa.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-slate-50/20 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 text-slate-450 text-[10px] font-black uppercase tracking-widest">
                          <th className="px-6 py-2.5">Lançamento</th>
                          <th className="px-6 py-2.5">Vencimento</th>
                          <th className="px-6 py-2.5">Categoria</th>
                          <th className="px-6 py-2.5">Cliente / Fornecedor / Canal</th>
                          <th className="px-6 py-2.5">Data Pagamento</th>
                          <th className="px-6 py-2.5">Valor</th>
                          <th className="px-6 py-2.5">Anexos</th>
                          <th className="px-6 py-2.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-350 font-medium">
                        {transacoes.map((t) => {
                          // Find client/fornecedor name
                          const associatedForn = dbFornecedores.find(f => f.id === t.id_fornecedor);

                          return (
                            <tr key={t.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-950/5 transition-all">
                              <td className="px-6 py-2">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    t.tipo === 'Entrada'
                                      ? 'bg-green-50 dark:bg-green-950/40 text-green-600'
                                      : 'bg-red-50 dark:bg-red-950/30 text-red-500'
                                  }`}>
                                    <DollarSign size={16} />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 dark:text-white text-sm">{t.descricao}</span>
                                    <span className="text-[10px] text-slate-400 font-normal">Doc: {t.data ? new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-2">
                                {t.data_vencimento ? (
                                  <span className="text-amber-600 dark:text-amber-400 font-bold font-mono text-xs">{new Date(t.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                ) : (
                                  <span className="text-slate-400 text-xs">-</span>
                                )}
                              </td>
                              <td className="px-6 py-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                  t.tipo === 'Entrada'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400 border border-green-200 dark:border-green-900/30'
                                    : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/30'
                                }`}>
                                  {t.categoria}
                                </span>
                              </td>
                              <td className="px-6 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {associatedForn ? (
                                  <span className="text-slate-800 dark:text-slate-200 font-bold">{associatedForn.razao_social}</span>
                                ) : (
                                  t.membro_contribuinte || 'Coletivo / Caixa'
                                )}
                              </td>
                              <td className="px-6 py-2 text-xs">
                                {t.data_pagamento ? (
                                  <span className="text-green-700 dark:text-green-400 font-bold font-mono">{new Date(t.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                ) : (
                                  <span className="text-red-500 dark:text-red-450 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5 bg-red-50 dark:bg-red-950/30 rounded border border-red-100 dark:border-red-900/30">Pendente</span>
                                )}
                              </td>
                              <td className="px-6 py-2">
                                <span className={`font-black text-sm ${
                                  t.tipo === 'Entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                                }`}>
                                  {t.tipo === 'Entrada' ? '+' : '-'} R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td className="px-6 py-2">
                                <button
                                  type="button"
                                  onClick={() => loadAttachmentsForTransacao(t.id)}
                                  className="text-amber-600 hover:text-amber-700 font-black text-xs uppercase flex items-center gap-1 hover:underline"
                                >
                                  <File size={14} />
                                  <span>Ver</span>
                                </button>
                              </td>
                              <td className="px-6 py-2 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => handleEdit(t)}
                                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-50 dark:hover:bg-slate-900 transition rounded-lg"
                                    title="Editar"
                                  >
                                    <Tag size={15} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(t.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-slate-50 dark:hover:bg-slate-900 transition rounded-lg"
                                    title="Remover"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* CONTAS SUBMODULE TAB */}
      {activeTab === 'contas' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Landmark className="text-amber-500" />
                Gerenciamento de Contas Bancárias
              </h3>
              <p className="text-xs text-slate-500 mt-1">Configure bancos, agências e contas para controle de saldos</p>
            </div>
            {!editingConta && (
              <button
                onClick={() => setEditingConta({ nome: '', banco: '', agencia: '', conta_corrente: '' })}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition"
              >
                Cadastrar Conta
              </button>
            )}
          </div>

          {editingConta && (
            <form onSubmit={handleSaveConta} className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-75Q space-y-4 animate-in slide-in-from-top-4 duration-200">
              <h4 className="text-xs font-black uppercase text-amber-500">{editingConta.id ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome Identificador *</label>
                  <input
                    type="text"
                    required
                    value={editingConta.nome || ''}
                    onChange={(e) => setEditingConta({...editingConta, nome: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                    placeholder="Ex: Conta BB Principal"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Instituição de Banco</label>
                  <input
                    type="text"
                    value={editingConta.banco || ''}
                    onChange={(e) => setEditingConta({...editingConta, banco: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    placeholder="Ex: Banco do Brasil"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Agência</label>
                  <input
                    type="text"
                    value={editingConta.agencia || ''}
                    onChange={(e) => setEditingConta({...editingConta, agencia: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    placeholder="Ex: 1234-5"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Conta Corrente</label>
                  <input
                    type="text"
                    value={editingConta.conta_corrente || ''}
                    onChange={(e) => setEditingConta({...editingConta, conta_corrente: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    placeholder="Ex: 98765-4"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingConta(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-bold hover:bg-slate-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded"
                >
                  Confirmar Salvar
                </button>
              </div>
            </form>
          )}

          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-4">Nome da Conta</th>
                  <th className="p-4">Banco</th>
                  <th className="p-4">Agência</th>
                  <th className="p-4">Nº Conta Corrente</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {dbContas.map((conta) => (
                  <tr key={conta.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{conta.nome}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{conta.banco || '-'}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 font-mono">{conta.agencia || '-'}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 font-mono">{conta.conta_corrente || '-'}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingConta(conta)}
                          className="p-1 text-slate-400 hover:text-amber-500 rounded"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteConta(conta.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {dbContas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">Nenhuma conta bancária cadastrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CATEGORIAS SUBMODULE TAB */}
      {activeTab === 'categorias' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="text-amber-500" />
                Gerenciamento de Categorias de Entrada/Saída
              </h3>
              <p className="text-xs text-slate-500 mt-1">Organize seu plano de contas classificando receitas (Créditos) e despesas (Débitos)</p>
            </div>
            {!editingCategoria && (
              <button
                onClick={() => setEditingCategoria({ nome: '', tipo: 'Crédito' })}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition"
              >
                Cadastrar Categoria
              </button>
            )}
          </div>

          {editingCategoria && (
            <form onSubmit={handleSaveCategoria} className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-750 max-w-xl space-y-4 animate-in slide-in-from-top-4 duration-200">
              <h4 className="text-xs font-black uppercase text-amber-500">{editingCategoria.id ? 'Editar Categoria' : 'Nova Categoria'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome da Categoria *</label>
                  <input
                    type="text"
                    required
                    value={editingCategoria.nome || ''}
                    onChange={(e) => setEditingCategoria({...editingCategoria, nome: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                    placeholder="Ex: Fornecedores Som"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo de Aplicação *</label>
                  <select
                    value={editingCategoria.tipo || 'Crédito'}
                    onChange={(e) => setEditingCategoria({...editingCategoria, tipo: e.target.value as any})}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="Crédito">Crédito (Entradas)</option>
                    <option value="Débito">Débito (Saídas)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCategoria(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-bold hover:bg-slate-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded"
                >
                  Salvar Categoria
                </button>
              </div>
            </form>
          )}

          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-4">Nome da Categoria</th>
                  <th className="p-4">Tipo (Fluxo)</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {dbCategorias.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{cat.nome}</td>
                    <td className="p-4">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        cat.tipo === 'Crédito'
                          ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
                      }`}>
                        {cat.tipo === 'Crédito' ? 'Crédito (Entrada)' : 'Débito (Saída)'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingCategoria(cat)}
                          className="p-1 text-slate-400 hover:text-amber-500 rounded"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategoria(cat.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {dbCategorias.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-400 italic">Nenhuma categoria cadastrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FORMAS DE PAGAMENTO SUBMODULE TAB */}
      {activeTab === 'formas_pagamento' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="text-amber-500" />
                Gerenciamento de Formas de Pagamento
              </h3>
              <p className="text-xs text-slate-500 mt-1">Cadastre formas de entrada e saída financeira (ex: PIX, Dinheiro, Transferência, Boleto...)</p>
            </div>
            {!editingForma && (
              <button
                onClick={() => setEditingForma({ nome: '' })}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition"
              >
                Cadastrar Forma de Pagamento
              </button>
            )}
          </div>

          {editingForma && (
            <form onSubmit={handleSaveForma} className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-750 max-w-md space-y-4 animate-in slide-in-from-top-4 duration-200">
              <h4 className="text-xs font-black uppercase text-amber-500">{editingForma.id ? 'Editar Forma Pagamento' : 'Nova Forma Pagamento'}</h4>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome Descritivo *</label>
                <input
                  type="text"
                  required
                  value={editingForma.nome || ''}
                  onChange={(e) => setEditingForma({...editingForma, nome: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-905 dark:text-white font-bold"
                  placeholder="Ex: Cartão de Débito"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingForma(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-bold hover:bg-slate-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded"
                >
                  Salvar
                </button>
              </div>
            </form>
          )}

          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-4">ID</th>
                  <th className="p-4">Descrição da Forma de Pagamento</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {dbFormasPagamento.map((forma) => (
                  <tr key={forma.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="p-4 text-xs font-mono text-slate-500 max-w-[120px] truncate">{forma.id}</td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{forma.nome}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingForma(forma)}
                          className="p-1 text-slate-400 hover:text-amber-500 rounded"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteForma(forma.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {dbFormasPagamento.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-400 italic">Nenhuma forma de pagamento cadastrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FLUXO DE CAIXA SUBMODULE TAB */}
      {activeTab === 'fluxo_caixa' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Bento-grid of balances */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Receitas</span>
                <p className="text-3xl font-black text-black dark:text-white">R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-12 h-12 bg-transparent text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Despesas</span>
                <p className="text-3xl font-black text-black dark:text-white">R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-12 h-12 bg-transparent text-red-500 dark:text-red-400 rounded-2xl flex items-center justify-center">
                <TrendingDown size={24} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Saldo Consolidado</span>
                <p className="text-3xl font-black text-black dark:text-white">R$ {saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-12 h-12 bg-transparent text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                <Wallet size={24} />
              </div>
            </div>
          </div>

          {/* Charts view */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 font-headline">Fluxo Diário / Histórico Próximo</h4>
            {chartData.length > 0 ? (
              <div className="h-64 w-full">
                <FinancialChart chartData={chartData} />
              </div>
            ) : (
              <div className="h-64 w-full flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">Sem dados suficientes para exibição</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
