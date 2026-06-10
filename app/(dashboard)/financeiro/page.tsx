'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useIgreja } from '@/context/IgrejaContext';
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, Calendar, Tag, RefreshCw, Save, X, DollarSign } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

type Transacao = {
  id: string;
  id_igreja: string;
  tipo: 'Entrada' | 'Saída';
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  membro_contribuinte?: string;
};

export default function FinanceiroPage() {
  const { selectedIgreja } = useIgreja();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [membros, setMembros] = useState<{ id: string; nome: string }[]>([]);

  const [currentTransacao, setCurrentTransacao] = useState<Partial<Transacao>>({
    tipo: 'Entrada',
    categoria: 'Dízimo',
    descricao: '',
    valor: 0,
    data: '',
    membro_contribuinte: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load transactions and members
  useEffect(() => {
    if (selectedIgreja) {
      setLoading(true);
      // Load from localStorage for quick/durable persistence
      const stored = localStorage.getItem(`financeiro_igreja_${selectedIgreja.id}`);
      if (stored) {
        try {
          setTransacoes(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      } else {
        // Seeding initial template transactions for beautiful initial display
        const genericData: Transacao[] = [
          {
            id: '1',
            id_igreja: selectedIgreja.id,
            tipo: 'Entrada',
            categoria: 'Dízimo',
            descricao: 'Contribuição Mensal Organizada',
            valor: 1500,
            data: new Date().toISOString().split('T')[0],
          },
          {
            id: '2',
            id_igreja: selectedIgreja.id,
            tipo: 'Entrada',
            categoria: 'Oferta',
            descricao: 'Oferta do Culto de Domingo',
            valor: 850,
            data: new Date().toISOString().split('T')[0],
          },
          {
            id: '3',
            id_igreja: selectedIgreja.id,
            tipo: 'Saída',
            categoria: 'Aluguel',
            descricao: 'Aluguel do Salão do Templo',
            valor: 1100,
            data: new Date().toISOString().split('T')[0],
          },
        ];
        setTransacoes(genericData);
        localStorage.setItem(`financeiro_igreja_${selectedIgreja.id}`, JSON.stringify(genericData));
      }
      
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
      setLoading(false);
    } else {
      setTransacoes([]);
      setLoading(false);
    }
  }, [selectedIgreja]);

  const saveTransactionsToStorage = (updated: Transacao[]) => {
    if (selectedIgreja) {
      localStorage.setItem(`financeiro_igreja_${selectedIgreja.id}`, JSON.stringify(updated));
    }
  };

  const handleNew = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setCurrentTransacao({
      tipo: 'Entrada',
      categoria: 'Dízimo',
      descricao: '',
      valor: 0,
      data: todayStr,
      membro_contribuinte: '',
    });
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = (id: string) => {
    if (!confirm('Deseja realmente remover este lançamento financeiro?')) {
      return;
    }
    const updated = transacoes.filter((t) => t.id !== id);
    setTransacoes(updated);
    saveTransactionsToStorage(updated);
    setSuccess('Lançamento removido com sucesso!');
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    const payload: Transacao = {
      id: Math.random().toString(36).substring(2, 9),
      id_igreja: selectedIgreja.id,
      tipo: currentTransacao.tipo || 'Entrada',
      categoria: currentTransacao.categoria || 'Outros',
      descricao: currentTransacao.descricao,
      valor: valorNum,
      data: currentTransacao.data || new Date().toISOString().split('T')[0],
      membro_contribuinte: currentTransacao.membro_contribuinte || undefined,
    };

    const updated = [payload, ...transacoes];
    setTransacoes(updated);
    saveTransactionsToStorage(updated);
    setSuccess('Lançamento registrado com sucesso!');
    setIsEditing(false);
  };

  const handleTipoChange = (newTipo: 'Entrada' | 'Saída') => {
    setCurrentTransacao(prev => ({
      ...prev,
      tipo: newTipo,
      categoria: newTipo === 'Entrada' ? 'Dízimo' : 'Aluguel'
    }));
  };

  // Balances calculation
  const totalEntradas = transacoes
    .filter((t) => t.tipo === 'Entrada')
    .reduce((sum, t) => sum + t.valor, 0);

  const totalSaidas = transacoes
    .filter((t) => t.tipo === 'Saída')
    .reduce((sum, t) => sum + t.valor, 0);

  const saldoTotal = totalEntradas - totalSaidas;

  // Chart structured data
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
    .slice(-8); // Get latest 8 active days

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-1">Dízimos, Ofertas e Contabilidade</p>
          <h2 className="text-3xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">Fluxo de Caixa</h2>
          <p className="text-slate-500 text-sm">
            Demonstrativos financeiros da congregação {selectedIgreja?.nome || ''}
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={handleNew}
            disabled={!selectedIgreja}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-md transition active:scale-95 text-sm uppercase tracking-wider"
          >
            <Plus size={18} />
            Novo Lançamento
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
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-700 pb-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Sinalizar Novo Lançamento Financeiro
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
                  Entrada (Crédito)
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
                  Saída (Débito)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Categoria *
              </label>
              <select
                value={currentTransacao.categoria || 'Dízimo'}
                onChange={(e) => setCurrentTransacao({ ...currentTransacao, categoria: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
              >
                {currentTransacao.tipo === 'Entrada' ? (
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
                )}
              </select>
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
                Data do Fluxo
              </label>
              <input
                type="date"
                required
                value={currentTransacao.data || ''}
                onChange={(e) => setCurrentTransacao({ ...currentTransacao, data: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Contribuição Nominal (Válido para Dízimos - Opcional)
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

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Descrição ou Observações *
              </label>
              <input
                type="text"
                required
                value={currentTransacao.descricao || ''}
                onChange={(e) => setCurrentTransacao({ ...currentTransacao, descricao: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                placeholder="Ex. Contribuição livre ou pagamento fatura de luz de maio"
              />
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
              className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-xl font-black transition-all shadow-md hover:opacity-90 uppercase text-xs tracking-widest"
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
                <p className="text-3xl font-black text-green-600 dark:text-green-400">R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Despesas</span>
                <p className="text-3xl font-black text-red-500 dark:text-red-400">R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 rounded-2xl flex items-center justify-center">
                <TrendingDown size={24} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Saldo Consolidado</span>
                <p className={`text-3xl font-black ${saldoTotal >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600'}`}>R$ {saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                <Wallet size={24} />
              </div>
            </div>
          </div>

          {/* Charts view */}
          {chartData.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 font-headline">Fluxo Diário / Histórico Próximo</h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="data" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="Entrada" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Saída" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/20 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 text-slate-450 text-[10px] font-black uppercase tracking-widest">
                      <th className="px-6 py-4">Lançamento</th>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Categoria</th>
                      <th className="px-6 py-4">Doador / Destino</th>
                      <th className="px-6 py-4">Valor</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-350 font-medium">
                    {transacoes.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-950/5 transition-all">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              t.tipo === 'Entrada'
                                ? 'bg-green-50 dark:bg-green-950/40 text-green-600'
                                : 'bg-red-50 dark:bg-red-950/30 text-red-500'
                            }`}>
                              <DollarSign size={16} />
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white text-sm">{t.descricao}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar size={13} />
                            <span>{t.data ? new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                            t.tipo === 'Entrada'
                              ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400 border border-green-200 dark:border-green-900/30'
                              : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/30'
                          }`}>
                            {t.categoria}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {t.membro_contribuinte || 'Coletivo / Caixa'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-black text-sm ${
                            t.tipo === 'Entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                          }`}>
                            {t.tipo === 'Entrada' ? '+' : '-'} R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-2 text-slate-400 hover:text-red-650 hover:bg-slate-50 dark:hover:bg-slate-900 transition rounded-lg"
                            title="Remover"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
