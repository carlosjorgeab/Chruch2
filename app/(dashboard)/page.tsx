'use client';

import { useState, useEffect } from 'react';
import { Users, UsersRound, Wallet, BookOpen, RefreshCw, BarChart2, PieChart, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useIgreja } from '@/context/IgrejaContext';

// Import recharts dynamically to avoid any SSR issues, or guard with mounted state
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';

export default function Home() {
  const { selectedIgreja } = useIgreja();
  const [mounted, setMounted] = useState(false);

  // Stats states
  const [membrosCount, setMembrosCount] = useState<number | null>(null);
  const [comunidadesCount, setComunidadesCount] = useState<number | null>(null);
  const [lecoesCount, setLecoesCount] = useState<number | null>(null);
  const [entradasMesVal, setEntradasMesVal] = useState<number | null>(null);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tooltip custom styling
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // Time-frame selections
  const [cashFlowPeriod, setCashFlowPeriod] = useState<'diario' | 'mensal' | 'anual'>('mensal');
  const [categoryPeriod, setCategoryPeriod] = useState<'diario' | 'mensal' | 'anual'>('mensal');
  const [categoryFlowType, setCategoryFlowType] = useState<'Entrada' | 'Saída'>('Saída');

  const CATEGORY_COLORS = ['#E4A232', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#475569', '#14B8A6', '#F43F5E'];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedIgreja?.id) return;
    const churchId = selectedIgreja.id;

    async function loadDashboardData() {
      try {
        setLoading(true);
        const id = churchId;

        // Count active members
        const { count: membCount, error: err1 } = await supabase
          .from('membros')
          .select('*', { count: 'exact', head: true })
          .eq('id_igreja', id)
          .eq('status', 'Ativo');

        setMembrosCount(err1 ? 0 : (membCount || 0));

        // Count communities
        const { count: comCount, error: err2 } = await supabase
          .from('comunidades')
          .select('*', { count: 'exact', head: true })
          .eq('id_igreja', id);

        setComunidadesCount(err2 ? 0 : (comCount || 0));

        // Count lessons
        const { count: lecCount, error: err3 } = await supabase
          .from('lecoes')
          .select('*', { count: 'exact', head: true })
          .eq('id_igreja', id);

        setLecoesCount(err3 ? 0 : (lecCount || 0));

        // Get all transactions
        const { data: transData, error: err4 } = await supabase
          .from('transacoes')
          .select('*')
          .eq('id_igreja', id);

        if (err4) {
          setTransacoes([]);
          setEntradasMesVal(0);
        } else if (transData) {
          setTransacoes(transData);
          
          // Calculate current month entries
          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth() + 1; // 1-indexed

          let monthEntriesSum = 0;
          transData.forEach((t: any) => {
            if (t.tipo === 'Entrada') {
              const [tYear, tMonth] = t.data.split('-').map(Number);
              if (tYear === currentYear && tMonth === currentMonth) {
                monthEntriesSum += Number(t.valor);
              }
            }
          });
          setEntradasMesVal(monthEntriesSum);
        }
      } catch (err) {
        console.error('Error compiling dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [selectedIgreja]);

  // Translate labels helper
  const monthsAbbr = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Process data for Cash Flow
  const getCashFlowData = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (cashFlowPeriod === 'diario') {
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const dailyMap: Record<number, { Entrada: number; Saída: number }> = {};
      for (let d = 1; d <= daysInMonth; d++) {
        dailyMap[d] = { Entrada: 0, Saída: 0 };
      }

      transacoes.forEach((t) => {
        const [y, m, d] = t.data.split('-').map(Number);
        if (y === currentYear && m === currentMonth) {
          if (t.tipo === 'Entrada') dailyMap[d].Entrada += Number(t.valor);
          if (t.tipo === 'Saída') dailyMap[d].Saída += Number(t.valor);
        }
      });

      return Object.keys(dailyMap)
        .map((d) => ({
          name: `${d}`,
          Entradas: dailyMap[Number(d)].Entrada,
          Saídas: dailyMap[Number(d)].Saída,
        }))
        .sort((a, b) => Number(a.name) - Number(b.name));
    }

    if (cashFlowPeriod === 'mensal') {
      const monthlyMap: Record<number, { Entrada: number; Saída: number }> = {};
      for (let m = 1; m <= 12; m++) {
        monthlyMap[m] = { Entrada: 0, Saída: 0 };
      }

      transacoes.forEach((t) => {
        const [y, m] = t.data.split('-').map(Number);
        if (y === currentYear) {
          if (t.tipo === 'Entrada') monthlyMap[m].Entrada += Number(t.valor);
          if (t.tipo === 'Saída') monthlyMap[m].Saída += Number(t.valor);
        }
      });

      return monthsAbbr.map((mName, i) => ({
        name: mName,
        Entradas: monthlyMap[i + 1].Entrada,
        Saídas: monthlyMap[i + 1].Saída,
      }));
    }

    // Yearly
    const yearlyMap: Record<number, { Entrada: number; Saída: number }> = {};
    transacoes.forEach((t) => {
      const [y] = t.data.split('-').map(Number);
      if (!yearlyMap[y]) {
        yearlyMap[y] = { Entrada: 0, Saída: 0 };
      }
      if (t.tipo === 'Entrada') yearlyMap[y].Entrada += Number(t.valor);
      if (t.tipo === 'Saída') yearlyMap[y].Saída += Number(t.valor);
    });

    const sortedYears = Object.keys(yearlyMap).map(Number).sort((a, b) => a - b);
    if (sortedYears.length === 0) {
      return [{ name: `${currentYear}`, Entradas: 0, Saídas: 0 }];
    }

    return sortedYears.map((y) => ({
      name: `${y}`,
      Entradas: yearlyMap[y].Entrada,
      Saídas: yearlyMap[y].Saída,
    }));
  };

  // Process data for Categories
  const getCategoryData = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const filtered = transacoes.filter((t) => {
      if (t.tipo !== categoryFlowType) return false;
      const [y, m] = t.data.split('-').map(Number);

      if (categoryPeriod === 'diario') {
        return y === currentYear && m === currentMonth;
      }
      if (categoryPeriod === 'mensal') {
        return y === currentYear;
      }
      return true; // Anual (Todo o período)
    });

    const catMap: Record<string, number> = {};
    filtered.forEach((t) => {
      const cat = t.categoria || 'Outros';
      catMap[cat] = (catMap[cat] || 0) + Number(t.valor);
    });

    return Object.keys(catMap)
      .map((cat) => ({
        name: cat,
        value: catMap[cat],
      }))
      .sort((a, b) => b.value - a.value);
  };

  const cashFlowData = getCashFlowData();
  const categoryData = getCategoryData();

  if (!mounted) {
    return (
      <div className="p-8 space-y-8 flex items-center justify-center min-h-[450px]" id="dashboard-loading-mount">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-amber-500" size={36} />
          <p className="text-sm font-semibold text-slate-500 animate-pulse">Carregando painel principal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto" id="dashboard-container">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4" id="dashboard-header">
        <div>
          <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1.5 ml-0.5">Visão Geral</p>
          <h2 className="text-2xl md:text-3xl font-black font-headline text-slate-900 dark:text-white uppercase leading-none">
            {selectedIgreja ? selectedIgreja.nome : 'Carregando congregação...'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 font-medium">Resumo dinâmico e estatísticas atualizadas em tempo real</p>
        </div>
      </div>

      {/* STATS HIGHLIGHT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="dashboard-stats-grid">
        {/* Panel 1: Membros Ativos */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-5 hover:scale-102 transition-all duration-250 group cursor-default" id="stat-card-membros">
          <div className="w-14 h-14 rounded-2xl bg-transparent flex items-center justify-center text-blue-600 dark:text-blue-400 transition-colors">
            <Users size={26} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Membros Ativos</p>
            {loading ? (
              <div className="h-7 w-12 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg mt-1" />
            ) : (
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {membrosCount ?? 0}
              </p>
            )}
          </div>
        </div>

        {/* Panel 2: Comunidades / Grupos */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-5 hover:scale-102 transition-all duration-250 group cursor-default" id="stat-card-comunidades">
          <div className="w-14 h-14 rounded-2xl bg-transparent flex items-center justify-center text-green-600 dark:text-green-400 transition-colors">
            <UsersRound size={26} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Células / Comunidades</p>
            {loading ? (
              <div className="h-7 w-12 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg mt-1" />
            ) : (
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {comunidadesCount ?? 0}
              </p>
            )}
          </div>
        </div>

        {/* Panel 3: Lições / EBD */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-5 hover:scale-102 transition-all duration-250 group cursor-default" id="stat-card-lecoes">
          <div className="w-14 h-14 rounded-2xl bg-transparent flex items-center justify-center text-purple-600 dark:text-purple-400 transition-colors">
            <BookOpen size={26} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Estudos / Lições</p>
            {loading ? (
              <div className="h-7 w-12 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg mt-1" />
            ) : (
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {lecoesCount ?? 0}
              </p>
            )}
          </div>
        </div>

        {/* Panel 4: Entradas do Mês Atual */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-5 hover:scale-102 transition-all duration-250 group cursor-default" id="stat-card-financeiro">
          <div className="w-14 h-14 rounded-2xl bg-transparent flex items-center justify-center text-amber-600 dark:text-amber-400 transition-colors">
            <Wallet size={26} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Dízimos & Entradas (Mês)</p>
            {loading ? (
              <div className="h-7 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg mt-1" />
            ) : (
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 select-all">
                {entradasMesVal !== null ? `R$ ${entradasMesVal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : 'R$ 0'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="dashboard-charts-grid">
        
        {/* CHART 1: FLUXO DE CAIXA */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-6 flex flex-col" id="panel-cash-flow">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5" id="panel-cash-flow-header">
            <div>
              <div className="flex items-center gap-2 text-slate-800 dark:text-white">
                <BarChart2 className="text-amber-500 shrink-0" size={16} />
                <h3 className="text-sm font-black uppercase tracking-wider">Fluxo de Caixa (Entradas vs Saídas)</h3>
              </div>
              <p className="text-slate-400 text-[11px] mt-1 font-medium">Acompanhe as receitas recebidas comparadas com as despesas quitadas</p>
            </div>

            {/* Time period options */}
            <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-850" id="cashflow-tabs-selector">
              {(['diario', 'mensal', 'anual'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setCashFlowPeriod(period)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    cashFlowPeriod === period
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                  id={`cashflow-tab-${period}`}
                >
                  {period === 'diario' ? 'Diário' : period === 'mensal' ? 'Mensal' : 'Anual'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-[300px] h-[320px] w-full" id="cash-flow-chart-wrapper">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold text-xs uppercase animate-pulse">
                Processando transações...
              </div>
            ) : cashFlowData.length === 0 || (cashFlowData.length === 1 && cashFlowData[0].Entradas === 0 && cashFlowData[0].Saídas === 0) ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 italic text-xs gap-2">
                <Calendar size={28} className="text-slate-300 dark:text-slate-700" />
                Nenhum lançamento financeiro registrado {cashFlowPeriod === 'diario' ? 'neste mês' : cashFlowPeriod === 'mensal' ? 'neste ano' : 'ainda'}.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData} margin={{ top: 15, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800/60" />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 'bold' }} 
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => val >= 1000 ? `R$ ${(val / 1000).toFixed(0)}k` : `R$ ${val}`}
                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 'bold' }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#F8FAFC', opacity: 0.15 }}
                    contentStyle={{ 
                      backgroundColor: '#1E293B', 
                      borderRadius: '16px', 
                      borderColor: '#334155',
                      padding: '12px 16px',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                    }}
                    labelStyle={{ color: '#E2E8F0', fontWeight: 'bold', fontSize: '11px', marginBottom: '6px' }}
                    itemStyle={{ color: '#F1F5F9', fontSize: '11px', padding: '1px 0' }}
                    formatter={(val: any, name: any) => [
                      `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      String(name)
                    ]}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94A3B8' }}
                  />
                  <Bar 
                    dataKey="Entradas" 
                    fill="#10B981" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={28}
                  />
                  <Bar 
                    dataKey="Saídas" 
                    fill="#F43F5E" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 2: CATEGORIAS DE ENTRADA/SAÍDA */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-6 flex flex-col" id="panel-category-breakdown">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5" id="panel-category-header">
            <div>
              <div className="flex items-center gap-2 text-slate-800 dark:text-white">
                <PieChart className="text-amber-500 shrink-0" size={16} />
                <h3 className="text-sm font-black uppercase tracking-wider">Análise de Categorias</h3>
              </div>
              <p className="text-slate-400 text-[11px] mt-1 font-medium">Gráfico proporcional das categorias mais registradas</p>
            </div>

            {/* Controls panel: Inflow vs Outflow toggle & period toggle */}
            <div className="flex flex-wrap gap-2.5 items-center" id="category-controls">
              {/* Type selector (Entrada vs Saída) */}
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl" id="category-flow-selector">
                <button
                  type="button"
                  onClick={() => setCategoryFlowType('Entrada')}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all gap-1 flex items-center ${
                    categoryFlowType === 'Entrada'
                      ? 'bg-[#10B981] text-white shadow-sm'
                      : 'text-slate-400 dark:text-slate-500 hover:text-[#10B981]'
                  }`}
                >
                  <TrendingUp size={10} />
                  Entradas
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFlowType('Saída')}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all gap-1 flex items-center ${
                    categoryFlowType === 'Saída'
                      ? 'bg-[#F43F5E] text-white shadow-sm'
                      : 'text-slate-400 dark:text-slate-500 hover:text-[#F43F5E]'
                  }`}
                >
                  <TrendingDown size={10} />
                  Saídas
                </button>
              </div>

              {/* Time period options */}
              <div className="flex bg-slate-50 dark:bg-slate-500/10 p-1 rounded-xl border border-slate-100 dark:border-slate-800" id="category-tabs-selector">
                {(['diario', 'mensal', 'anual'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setCategoryPeriod(period)}
                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                      categoryPeriod === period
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-205'
                    }`}
                    id={`category-tab-${period}`}
                  >
                    {period === 'diario' ? 'Mês' : period === 'mensal' ? 'Ano' : 'Geral'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[300px] h-[320px] w-full flex flex-col md:flex-row items-center gap-4" id="category-chart-wrapper">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold text-xs uppercase animate-pulse">
                Processando categorias...
              </div>
            ) : categoryData.length === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 italic text-xs gap-2">
                <Calendar size={28} className="text-slate-300 dark:text-slate-700" />
                Nenhum lançamento de {categoryFlowType === 'Entrada' ? 'Entrada' : 'Saída'} neste filtro.
              </div>
            ) : (
              <>
                {/* Recharts Pie Chart */}
                <div className="w-full md:w-1/2 h-[220px] md:h-full relative" id="recharts-pie-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: '#1E293B', 
                          borderRadius: '16px', 
                          borderColor: '#334155',
                          padding: '12px 16px',
                        }}
                        labelStyle={{ display: 'none' }}
                        itemStyle={{ color: '#F1F5F9', fontSize: '11px', fontWeight: 'bold' }}
                        formatter={(val: any) => `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                  {/* Absolute Center Sum */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center" id="pie-center-summary">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                    <p className="text-sm font-black text-slate-850 dark:text-white mt-0.5 truncate max-w-[120px]">
                      R$ {categoryData.reduce((acc, curr) => acc + curr.value, 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>

                {/* Categories Legend List */}
                <div className="w-full md:w-1/2 max-h-[250px] overflow-y-auto space-y-3 px-2 flex flex-col justify-center" id="recharts-legend-list">
                  {categoryData.slice(0, 6).map((item, idx) => {
                    const totalVal = categoryData.reduce((acc, curr) => acc + curr.value, 0);
                    const percent = totalVal > 0 ? ((item.value / totalVal) * 100).toFixed(0) : '0';
                    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

                    return (
                      <div key={item.name} className="flex justify-between items-center text-xs gap-3 font-semibold" id={`category-legend-item-${idx}`}>
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{item.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-slate-900 dark:text-white font-extrabold">
                            R$ {item.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold ml-1.5 bg-slate-50 dark:bg-slate-950 px-1.5 py-0.5 rounded-md">
                            {percent}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {categoryData.length > 6 && (
                    <p className="text-[10px] text-slate-400 font-bold text-center italic mt-2">
                      + {categoryData.length - 6} outras categorias
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
