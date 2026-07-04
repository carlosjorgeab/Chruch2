'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, UsersRound, Wallet, BookOpen, RefreshCw, BarChart2, PieChart, TrendingUp, TrendingDown, DollarSign, Calendar, Megaphone, FileText, Video, ChevronLeft, ChevronRight, ExternalLink, Download } from 'lucide-react';
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

const monthNamesPT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function memberBirthdayString(day: number, month: number) {
  return `${day} de ${monthNamesPT[month - 1]}`;
}

// Calendar Helper utilities for Agenda
const getStartOfWeek = (d: Date) => {
  const day = d.getDay();
  const diff = d.getDate() - day; // adjust when day is sunday
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getWeekDays = (current: Date) => {
  const start = getStartOfWeek(current);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(start);
    nextDay.setDate(start.getDate() + i);
    days.push(nextDay);
  }
  return days;
};

const getMonthDaysGrid = (current: Date) => {
  const year = current.getFullYear();
  const month = current.getMonth();
  
  // First day of current month
  const firstDay = new Date(year, month, 1);
  const startPadding = firstDay.getDay(); 
  
  // Total days in current month
  const totalDays = new Date(year, month + 1, 0).getDate();
  
  const grid = [];
  
  // Add padding from previous month
  for (let i = startPadding - 1; i >= 0; i--) {
    grid.push(new Date(year, month, -i));
  }
  
  // Add days of current month
  for (let i = 1; i <= totalDays; i++) {
    grid.push(new Date(year, month, i));
  }
  
  // Pad up to 35 or 42 cells (multiple of 7 columns)
  const currentLength = grid.length;
  const padNeeded = currentLength <= 35 ? 35 - currentLength : 42 - currentLength;
  for (let i = 1; i <= padNeeded; i++) {
    grid.push(new Date(year, month + 1, i));
  }
  
  return grid;
};

export default function Home() {
  const { selectedIgreja } = useIgreja();
  const [mounted, setMounted] = useState(false);

  // Stats states
  const [membrosCount, setMembrosCount] = useState<number | null>(null);
  const [comunidadesCount, setComunidadesCount] = useState<number | null>(null);
  const [lecoesCount, setLecoesCount] = useState<number | null>(null);
  const [entradasMesVal, setEntradasMesVal] = useState<number | null>(null);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [muralAvisos, setMuralAvisos] = useState<any[]>([]);
  const [currentMuralIndex, setCurrentMuralIndex] = useState(0);
  const [aniversariantes, setAniversariantes] = useState<any[]>([]);
  const [agendas, setAgendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Agenda selectors and view preferences
  const [viewType, setViewType] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const isYouTube = (url: string | null | undefined) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const isVimeo = (url: string | null | undefined) => {
    if (!url) return false;
    return url.includes('vimeo.com');
  };

  const isDirectVideo = (url: string | null | undefined) => {
    if (!url) return false;
    return !!url.match(/\.(mp4|webm|ogg)$/i);
  };

  const getActiveAvisos = () => {
    if (!muralAvisos) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return muralAvisos.filter((m) => {
      if (m.status !== 'Publicado') return false;

      // Handle date checks
      const start = m.data_inicio ? new Date(m.data_inicio + 'T00:00:00') : null;
      const end = m.data_fim ? new Date(m.data_fim + 'T00:00:00') : null;

      if (start && start > today) return false;
      if (end && end < today) return false;
      return true;
    });
  };

  const transitionToNext = () => {
    const active = getActiveAvisos();
    if (active.length <= 1) return;
    setCurrentMuralIndex((prevIndex) => 
      prevIndex === active.length - 1 ? 0 : prevIndex + 1
    );
  };

  // Automated transition of murais based on tempo_transicao (defaults to 10s if not set or invalid)
  useEffect(() => {
    const active = getActiveAvisos();
    if (active.length <= 1) return;
    
    const currentAviso = active[currentMuralIndex];

    let seconds = currentAviso?.tempo_transicao && currentAviso.tempo_transicao > 0 
      ? currentAviso.tempo_transicao 
      : 10;
      
    // Se for vídeo e o tempo_transicao for menor que 10 ou padrão, damos 25s de carrossel para não picar a reprodução e ao mesmo tempo garantir a rotação cíclica
    const hasVideo = currentAviso?.url_midia && (isYouTube(currentAviso.url_midia) || isVimeo(currentAviso.url_midia) || isDirectVideo(currentAviso.url_midia));
    if (hasVideo && (!currentAviso?.tempo_transicao || currentAviso.tempo_transicao <= 10)) {
      seconds = 25;
    }
       
    const timer = setTimeout(() => {
      transitionToNext();
    }, seconds * 1000);
    
    return () => clearTimeout(timer);
  }, [currentMuralIndex, muralAvisos]);

  // Listen to postMessage events from YouTube/Vimeo players to auto-transition on ended
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        let data = event.data;
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        
        // YouTube Player State Change Ended is state: 0 (YT.PlayerState.ENDED)
        if (data?.event === 'onStateChange' && data?.info === 0) {
          transitionToNext();
        } else if (data?.info?.playerState === 0) {
          transitionToNext();
        }

        // Vimeo finish / ended events
        if (data?.event === 'finish' || data?.event === 'ended') {
          transitionToNext();
        }
      } catch (e) {
        // Ignore parsing errors for non-JSON postMessages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [muralAvisos, currentMuralIndex]);

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

        // Get mural de avisos
        const { data: muralData, error: errMural } = await supabase
          .from('mural_avisos')
          .select('*')
          .eq('id_igreja', id)
          .eq('status', 'Publicado')
          .order('ordem', { ascending: true })
          .order('created_at', { ascending: false });

        if (errMural) {
          console.warn('Mural avisos pull skipped on dashboard:', errMural);
          setMuralAvisos([]);
        } else if (muralData) {
          setMuralAvisos(muralData);
        }

        // Fetch active members birthdays
        const { data: membBirthdays, error: errBirthdays } = await supabase
          .from('membros')
          .select('id, nome, foto_url, data_nascimento')
          .eq('id_igreja', id)
          .eq('status', 'Ativo')
          .not('data_nascimento', 'is', null);

        if (!errBirthdays && membBirthdays) {
          const today = new Date();
          const todayReset = new Date(today.getFullYear(), today.getMonth(), today.getDate());

          const processed = membBirthdays.map((m: any) => {
            const birth = m.data_nascimento; // e.g., "1994-06-25"
            const parts = birth.split('-');
            if (parts.length < 3) return null;
            const bMonth = parseInt(parts[1], 10);
            const bDay = parseInt(parts[2], 10);

            // Calculate "days until next birthday" starting from today
            let nextBirthDate = new Date(today.getFullYear(), bMonth - 1, bDay);
            if (nextBirthDate < todayReset) {
              nextBirthDate.setFullYear(today.getFullYear() + 1);
            }

            const diffTime = nextBirthDate.getTime() - todayReset.getTime();
            const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));

            return {
              ...m,
              bMonth,
              bDay,
              daysLeft,
              nextBirthDate
            };
          }).filter((m: any) => m !== null && m.daysLeft >= 0 && m.daysLeft <= 30) as any[];

          // Sort by daysLeft ascending (soonest first)
          processed.sort((a, b) => a.daysLeft - b.daysLeft);
          setAniversariantes(processed);
        } else {
          setAniversariantes([]);
        }

        // Fetch agendas
        const { data: agendaData, error: errAgenda } = await supabase
          .from('agendas')
          .select('*')
          .eq('id_igreja', id)
          .order('data_hora', { ascending: true });

        if (!errAgenda && agendaData) {
          // Na Visão Geral só podem ser visualizadas as Agendas Públicas
          const publicAgendas = agendaData.filter((item: any) => !item.privado);
          setAgendas(publicAgendas);
        } else {
          setAgendas([]);
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

  const activeAvisos = getActiveAvisos();

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

        {/* MURAL DE AVISOS MULTIMÍDIA */}
        <div 
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col" 
          id="dashboard-mural-avisos"
        >
          <div className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2 text-slate-800 dark:text-white">
                  <Megaphone className="text-amber-500 shrink-0" size={18} />
                  <h3 className="text-sm font-black uppercase tracking-wider">Mural de Avisos & Anúncios</h3>
                </div>
                <p className="text-slate-500 text-[11px] mt-1 font-medium">Últimas novidades, vídeos e eventos</p>
              </div>
            </div>

            {activeAvisos.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-955/20 rounded-2xl border border-slate-100 dark:border-slate-850 min-h-[220px] flex-1">
                <div className="w-12 h-12 rounded-xl bg-transparent text-amber-600 flex items-center justify-center shrink-0 mb-3">
                  <Megaphone size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-850 dark:text-white uppercase tracking-tight">Sem avisos para hoje</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-xs mt-1">
                  Não há avisos ou programações ativas no dia de hoje.
                </p>
              </div>
            ) : (
              (() => {
                const item = activeAvisos[currentMuralIndex] ?? activeAvisos[0];
                if (!item) return null;

                const hasVideoLink = item.url_midia && (isYouTube(item.url_midia) || isVimeo(item.url_midia) || isDirectVideo(item.url_midia));

                const getYouTubeEmbedUrl = (url: string | null | undefined) => {
                  if (!url) return null;
                  let videoId = '';
                  try {
                    if (url.includes('youtube.com/shorts/')) {
                      videoId = url.split('youtube.com/shorts/')[1]?.split('?')[0] || '';
                    } else if (url.includes('youtube.com/live/')) {
                      videoId = url.split('youtube.com/live/')[1]?.split('?')[0] || '';
                    } else if (url.includes('youtube.com/watch')) {
                      const urlParams = new URL(url).searchParams;
                      videoId = urlParams.get('v') || '';
                    } else if (url.includes('youtu.be/')) {
                      videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
                    } else if (url.includes('youtube.com/embed/')) {
                      videoId = url.split('youtube.com/embed/')[1]?.split('?')[0] || '';
                    } else {
                      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?"\s]{11})/);
                      if (match) videoId = match[1];
                    }
                  } catch (err) {
                    if (url.includes('v=')) {
                      videoId = url.split('v=')[1]?.split('&')[0] || '';
                    }
                  }
                  return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1` : null;
                };

                const getVimeoEmbedUrl = (url: string | null | undefined) => {
                  if (!url) return null;
                  try {
                    const match = url.match(/vimeo\.com\/(\d+)/);
                    return match ? `https://player.vimeo.com/video/${match[1]}?autoplay=1&muted=1&api=1` : null;
                  } catch {
                    return null;
                  }
                };

                const isPdf = !hasVideoLink && item.arquivo_base64 && (item.arquivo_base64.startsWith('data:application/pdf') || (item.arquivo_base64.startsWith('http') && (/\.pdf/i.test(item.arquivo_base64) || (item.arquivo_nome && /\.pdf$/i.test(item.arquivo_nome)))));
                const isImage = !hasVideoLink && item.arquivo_base64 && (item.arquivo_base64.startsWith('data:image/') || (item.arquivo_base64.startsWith('http') && (!/\.pdf/i.test(item.arquivo_base64) && !(item.arquivo_nome && /\.pdf$/i.test(item.arquivo_nome)))));

                let frameHeightClass = "h-[180px] md:h-[220px]";
                if (isPdf) {
                  frameHeightClass = "h-[340px] md:h-[485px]";
                } else if (hasVideoLink) {
                  frameHeightClass = "aspect-video w-full h-auto max-h-[350px]";
                } else if (isImage) {
                  frameHeightClass = "h-[240px] md:h-[365px]";
                }

                return (
                  <div className="flex flex-col gap-4 flex-1 justify-between mt-4">
                    {/* Media Column (Dynamic Viewport size according to media type) */}
                    {(item.url_midia || item.arquivo_base64) && (
                      <div className={`w-full relative ${frameHeightClass} rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-955/50 border border-slate-150 dark:border-slate-850 shadow-inner flex flex-col justify-center items-center`}>
                        {/* 1. YouTube Video */}
                        {item.url_midia && isYouTube(item.url_midia) && getYouTubeEmbedUrl(item.url_midia) && (
                          <div className="w-full h-full relative bg-black">
                            <iframe
                              src={getYouTubeEmbedUrl(item.url_midia)!}
                              title="Player de Vídeo"
                              className="absolute top-0 left-0 w-full h-full border-0 animate-fade-in"
                              allowFullScreen
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            />
                          </div>
                        )}

                        {/* 2. Vimeo Video */}
                        {item.url_midia && isVimeo(item.url_midia) && getVimeoEmbedUrl(item.url_midia) && (
                          <div className="w-full h-full relative bg-black">
                            <iframe
                              src={getVimeoEmbedUrl(item.url_midia)!}
                              title="Player Vimeo"
                              className="absolute top-0 left-0 w-full h-full border-0 animate-fade-in"
                              allowFullScreen
                              allow="autoplay; fullscreen; picture-in-picture"
                            />
                          </div>
                        )}

                        {/* 3. Direct HTML5 Video */}
                        {item.url_midia && isDirectVideo(item.url_midia) && (
                          <video 
                            autoPlay 
                            muted 
                            playsInline 
                            controls 
                            className="w-full h-full bg-black object-contain animate-fade-in"
                            onEnded={transitionToNext}
                          >
                            <source src={item.url_midia} />
                            Seu navegador não suporta a tag de vídeo HTML5.
                          </video>
                        )}

                        {/* 4. Image base64 Uploaded file (with link overlay if present) */}
                        {!hasVideoLink && item.arquivo_base64 && isImage && (
                          item.url_midia ? (
                            <a
                              href={item.url_midia}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full h-full block relative group overflow-hidden cursor-pointer"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.arquivo_base64}
                                alt={item.titulo}
                                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-270 flex items-center justify-center">
                                <div className="bg-amber-600 text-white font-extrabold text-[10px] px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-lg uppercase tracking-wider">
                                  <ExternalLink size={12} />
                                  Acessar Link Anexo
                                </div>
                              </div>
                              <div className="absolute bottom-2 right-2 bg-slate-955/95 backdrop-blur-sm text-amber-400 border border-amber-500/10 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1 z-10">
                                <ExternalLink size={8} />
                                Clique para abrir o link
                              </div>
                            </a>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.arquivo_base64}
                              alt={item.titulo}
                              className="w-full h-full object-contain"
                            />
                          )
                        )}

                        {/* 5. PDF Uploaded file - Shows the PDF embedded directly, showing only the first page */}
                        {!hasVideoLink && item.arquivo_base64 && isPdf && (
                          <div className="w-full h-full relative overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 flex flex-col">
                            <iframe
                              src={item.arquivo_base64.startsWith('data:') ? `${item.arquivo_base64.split('#')[0]}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH` : `${item.arquivo_base64}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                              className="w-full h-full object-cover pointer-events-none select-none overflow-hidden"
                              style={{ border: 0, overflow: 'hidden' }}
                              title={item.titulo}
                            />
                            {/* Overlay to block actions, intercept clicks and provide controls */}
                            <div className="absolute inset-0 bg-transparent flex items-end justify-end p-3 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const win = window.open();
                                  if (win) {
                                    const basePdf = item.arquivo_base64 || ''; const pdfUrl = basePdf.startsWith('data:') ? (basePdf.includes('#') ? basePdf.split('#')[0] : basePdf) : basePdf; const pdfWithPageLimit = `${pdfUrl}#page=1&toolbar=0&navpanes=0`;
                                    win.document.write(
                                      `<title>Visualização de PDF - ${item.arquivo_nome || 'Mural'}</title>` +
                                      `<iframe src="${pdfWithPageLimit}" frameborder="0" style="border:0; position:fixed; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`
                                    );
                                  }
                                }}
                                className="bg-amber-600/90 hover:bg-amber-600 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:scale-105 transition cursor-pointer backdrop-blur-xs shadow-md border border-amber-500/25"
                              >
                                <ExternalLink size={11} /> Expandir e Baixar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 6. Generic Link / External file */}
                        {!hasVideoLink && item.url_midia && !item.arquivo_base64 && (
                          <div className="p-4 text-center space-y-2 flex flex-col justify-center items-center h-full w-full">
                            <div className="p-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 text-slate-550 rounded-xl">
                              <ExternalLink size={24} />
                            </div>
                            <p className="text-[10px] text-slate-450 font-medium">Link anexado:</p>
                            <a
                              href={item.url_midia}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-653 hover:underline text-xs font-black max-w-[200px] truncate"
                            >
                              {item.url_midia}
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Below-media elements: Title, and next/prev buttons layout */}
                    <div className="flex flex-col gap-2 pt-3 border-t border-slate-55 dark:border-slate-850">
                      <h4 className="text-sm font-black font-headline text-slate-905 dark:text-white uppercase tracking-tight leading-normal line-clamp-1">
                        {item.titulo}
                      </h4>

                      {activeAvisos.length > 1 && (
                        <div className="flex items-center justify-between gap-2 mt-1">
                          {/* Display countdown */}
                          <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 px-2 py-1 rounded-md flex items-center gap-0.5" title="Tempo de exibição deste aviso">
                            ⏱️ {item.tempo_transicao || 10}s
                          </span>

                          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-955 border border-slate-150 dark:border-slate-850 p-1 rounded-lg">
                            <button 
                              type="button"
                              onClick={() => {
                                const nextIndex = currentMuralIndex === 0 ? activeAvisos.length - 1 : currentMuralIndex - 1;
                                setCurrentMuralIndex(nextIndex);
                              }}
                              className="p-1 px-2 rounded-md hover:bg-slate-150 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-400 transition cursor-pointer"
                              title="Aviso Anterior"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <span className="text-[10px] font-bold text-slate-400 px-1 select-none">
                              {currentMuralIndex + 1} / {activeAvisos.length}
                            </span>
                            <button 
                              type="button"
                              onClick={() => {
                                const nextIndex = currentMuralIndex === activeAvisos.length - 1 ? 0 : currentMuralIndex + 1;
                                setCurrentMuralIndex(nextIndex);
                              }}
                              className="p-1 px-2 rounded-md hover:bg-slate-150 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-400 transition cursor-pointer"
                              title="Próximo Aviso"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* PAINEL DE MEMBROS ANIVERSARIANTES */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col" id="dashboard-aniversariantes">
          <div className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2 text-slate-800 dark:text-white font-sans">
                  <Calendar className="text-amber-500 shrink-0" size={18} />
                  <h3 className="text-sm font-black uppercase tracking-wider">🎉 Aniversariantes do Mês</h3>
                </div>
                <p className="text-slate-500 text-[11px] mt-1 font-medium">Parabenize nossos membros nas datas especiais</p>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center text-center p-6 min-h-[220px] flex-1">
                <RefreshCw className="animate-spin text-amber-500" size={24} />
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-3">Carregando aniversariantes...</p>
              </div>
            ) : aniversariantes.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-955/20 rounded-2xl border border-slate-100 dark:border-slate-850 min-h-[220px] flex-1">
                <div className="w-12 h-12 rounded-xl bg-transparent text-slate-400 flex items-center justify-center mb-3">
                  <Calendar size={20} />
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-tight">Nenhum aniversário cadastrado</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-xs mt-1">
                  Certifique-se de cadastrar a data de nascimento dos membros ativos.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[340px] pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-201 dark:scrollbar-thumb-slate-800">
                {aniversariantes.slice(0, 8).map((membro) => {
                  const birthDay = memberBirthdayString(membro.bDay, membro.bMonth);
                  const isToday = membro.daysLeft === 0 || membro.daysLeft === 365 || membro.daysLeft === 366;
                  const isTomorrow = membro.daysLeft === 1;

                  return (
                    <div
                      key={membro.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-amber-55/10 dark:bg-slate-955/20 dark:hover:bg-amber-955/5 border border-slate-150/50 dark:border-slate-800/60 transition duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        {/* Member Photo */}
                        {membro.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={membro.foto_url}
                            alt={membro.nome}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-850"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-transparent text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-black text-xs font-sans uppercase">
                            {membro.nome.substring(0, 2)}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {membro.nome}
                          </p>
                          <p className="text-[10px] text-slate-450 font-bold flex items-center gap-1 mt-0.5">
                            📅 {birthDay}
                          </p>
                        </div>
                      </div>

                      {/* Birthday Status badge / Remaining Days */}
                      <div>
                        {isToday ? (
                          <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-emerald-200/50 dark:border-emerald-800/30 shadow-sm animate-pulse">
                            Hoje! 🎉
                          </span>
                        ) : isTomorrow ? (
                          <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                            Amanhã
                          </span>
                        ) : (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-705/60">
                            Faltam {membro.daysLeft} dias
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* PAINEL DE AGENDAS CADASTRADAS */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col lg:col-span-2" id="dashboard-agendas">
          <div className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2 text-slate-800 dark:text-white font-sans">
                  <Calendar className="text-amber-500 shrink-0" size={18} />
                  <h3 className="text-sm font-black uppercase tracking-wider">📅 Agenda da Igreja</h3>
                </div>
                <p className="text-slate-500 text-[11px] mt-1 font-medium">Acompanhe as programações, reuniões, cultos e compromissos</p>
              </div>
            </div>

            {/* Selector toolbar header */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50/55 dark:bg-slate-950/45 p-3 rounded-2xl border border-slate-150/40 dark:border-slate-850/50">
              {/* Segmented Selector slots */}
              <div className="flex bg-slate-150/50 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800 shadow-inner">
                {(['dia', 'semana', 'mes'] as const).map((vt) => (
                  <button
                    key={vt}
                    onClick={() => setViewType(vt)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                      viewType === vt
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-amber-505'
                    }`}
                  >
                    {vt === 'dia' ? 'Dia a Dia' : vt === 'semana' ? 'Semanal' : 'Mensal'}
                  </button>
                ))}
              </div>

              {/* Navigation Arrows for Weeks and Months */}
              {viewType !== 'dia' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const newDate = new Date(currentDate);
                      if (viewType === 'semana') {
                        newDate.setDate(newDate.getDate() - 7);
                      } else {
                        newDate.setMonth(newDate.getMonth() - 1);
                      }
                      setCurrentDate(newDate);
                    }}
                    className="p-1.5 px-3 bg-white hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-650 dark:text-slate-300 font-extrabold text-[10px] transition cursor-pointer"
                  >
                    ◀
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-350 min-w-[120px] text-center">
                    {viewType === 'semana' ? (
                      `Sem: ${getStartOfWeek(currentDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
                    ) : (
                      currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                    )}
                  </span>
                  <button
                    onClick={() => {
                      const newDate = new Date(currentDate);
                      if (viewType === 'semana') {
                        newDate.setDate(newDate.getDate() + 7);
                      } else {
                        newDate.setMonth(newDate.getMonth() + 1);
                      }
                      setCurrentDate(newDate);
                    }}
                    className="p-1.5 px-3 bg-white hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-650 dark:text-slate-300 font-extrabold text-[10px] transition cursor-pointer"
                  >
                    ▶
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="p-1 px-2.5 bg-amber-100 dark:bg-amber-955/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30 rounded-lg font-black text-[9px] uppercase tracking-wider hover:opacity-95 transition cursor-pointer ml-1"
                  >
                    Hoje
                  </button>
                </div>
              ) : (
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Exibindo próximos 6 compromissos</span>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center text-center p-6 min-h-[140px] flex-1">
                <RefreshCw className="animate-spin text-amber-500" size={24} />
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-3">Carregando eventos...</p>
              </div>
            ) : agendas.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-955/20 rounded-2xl border border-slate-100 dark:border-slate-850 min-h-[140px] flex-1">
                <div className="w-10 h-10 rounded-xl bg-transparent text-slate-400 flex items-center justify-center mb-2">
                  <Calendar size={18} />
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-tight">Nenhum evento agendado</h4>
                <p className="text-[11px] text-slate-500 font-medium max-w-xs mt-1">
                  Não há programações agendadas para o período selecionado.
                </p>
              </div>
            ) : viewType === 'dia' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agendas.slice(0, 6).map((item) => {
                  const eventDate = new Date(item.data_hora);
                  const isUpcoming = eventDate >= new Date();
                  
                  let badgeColor = "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200/50";
                  let borderStyle = "border-slate-100 dark:border-slate-800";
                  if (item.status === 'Importante') {
                    badgeColor = "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200/50";
                    borderStyle = "border-red-100 dark:border-red-950/20";
                  } else if (item.status === 'Alerta') {
                    badgeColor = "bg-amber-50 text-amber-700 dark:bg-amber-955/20 dark:text-amber-400 border-amber-200/50";
                    borderStyle = "border-amber-100 dark:border-amber-950/20";
                  }

                  const hasEnd = item.data_hora_fim;
                  const isAllDay = item.dia_inteiro;
                  const finalDate = hasEnd ? new Date(item.data_hora_fim) : null;
                  
                  let dateLabel = eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                  if (finalDate && !isAllDay && eventDate.toDateString() !== finalDate.toDateString()) {
                    dateLabel += ` - ${finalDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
                  } else {
                    dateLabel = eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
                  }

                  let timeLabel = isAllDay ? 'Dia Inteiro' : eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  if (finalDate && !isAllDay) {
                    timeLabel += ` às ${finalDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} Horas`;
                  } else if (!isAllDay) {
                    timeLabel += ' Horas';
                  }

                  return (
                    <div 
                      key={item.id}
                      className={`p-4 rounded-2xl border bg-slate-50/50 dark:bg-slate-955/20 flex flex-col justify-between gap-3 hover:scale-[1.01] transition duration-200 ${borderStyle}`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex gap-1 items-center">
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border ${badgeColor}`}>
                              {item.status}
                            </span>
                            {item.privado && (
                              <span className="bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 flex items-center gap-0.5" title="Evento Privado">
                                🔒 Privado
                              </span>
                            )}
                          </div>
                          {!isUpcoming && (
                            <span className="text-[8px] text-slate-450 dark:text-slate-500 uppercase font-black tracking-widest bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                              Encerrado
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-tight line-clamp-2 leading-snug">
                          {item.titulo}
                        </h4>
                      </div>
                      
                      <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-850">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5 truncate">
                          📅 {dateLabel}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5 truncate">
                          ⏰ {timeLabel}
                        </div>
                        {item.local && (
                          <div className="text-[10px] text-slate-550 dark:text-slate-400 font-bold flex items-center gap-1.5 truncate" title={item.local}>
                            📍 {item.local}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : viewType === 'semana' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {getWeekDays(currentDate).map((day) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  const dayEvents = agendas.filter((item) => {
                    const eventDay = new Date(item.data_hora);
                    return eventDay.toDateString() === day.toDateString();
                  });
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={`p-3 rounded-2xl border transition duration-200 ${
                        isToday
                          ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/35'
                          : 'bg-slate-50/50 dark:bg-slate-955/20 border-slate-100/60 dark:border-slate-800/80'
                      }`}
                    >
                      <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-850 mb-2">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">
                          {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                        </p>
                        <p className={`text-xs font-black ${isToday ? 'text-amber-500 dark:text-amber-400' : 'text-slate-850 dark:text-slate-100'}`}>
                          {day.getDate()}
                        </p>
                      </div>

                      {dayEvents.length === 0 ? (
                        <div className="text-center py-4">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sem Eventos</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto scrollbar-thin">
                          {dayEvents.map((item) => {
                            const isAllDay = item.dia_inteiro;
                            const tTime = new Date(item.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                            let dotCol = 'bg-blue-500';
                            if (item.status === 'Importante') dotCol = 'bg-red-500';
                            else if (item.status === 'Alerta') dotCol = 'bg-amber-500';
                            
                            return (
                              <div
                                key={item.id}
                                className="p-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl space-y-0.5 text-left"
                                title={`${item.titulo}${item.local ? ` em ${item.local}` : ''}`}
                              >
                                <div className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCol}`} />
                                  <p className="text-[9px] font-bold text-slate-800 dark:text-slate-200 truncate uppercase leading-none">
                                    {item.titulo}
                                  </p>
                                </div>
                                <p className="text-[8px] text-slate-450 font-bold ml-2.5 leading-none">
                                  {isAllDay ? 'Dia Int.' : tTime}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Calendar columns headers */}
                <div className="grid grid-cols-7 gap-1 text-center font-black text-[9px] uppercase tracking-wider text-slate-400 pb-1">
                  <div>Dom</div>
                  <div>Seg</div>
                  <div>Ter</div>
                  <div>Qua</div>
                  <div>Qui</div>
                  <div>Sex</div>
                  <div>Sáb</div>
                </div>

                {/* Calendar Grid cells */}
                <div className="grid grid-cols-7 gap-1 bg-slate-100/50 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-850">
                  {getMonthDaysGrid(currentDate).map((day) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = day.toDateString() === new Date().toDateString();
                    const dayEvents = agendas.filter((item) => {
                      const eventDay = new Date(item.data_hora);
                      return eventDay.toDateString() === day.toDateString();
                    });

                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[65px] md:min-h-[85px] p-1.5 rounded-xl flex flex-col justify-between transition ${
                          isToday
                            ? 'bg-amber-500/10 border border-amber-500/40'
                            : isCurrentMonth 
                              ? 'bg-white dark:bg-slate-900 border border-slate-150/40 dark:border-slate-800/50' 
                              : 'bg-slate-50/50 dark:bg-slate-900/20 opacity-40'
                        }`}
                      >
                        {/* Day number */}
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[9px] font-black px-1 rounded ${
                            isToday 
                              ? 'bg-[#E4A232] text-white' 
                              : isCurrentMonth 
                                ? 'text-slate-800 dark:text-white' 
                                : 'text-slate-400'
                          }`}>
                            {day.getDate()}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="text-[7.5px] font-extrabold text-[#E4A232] bg-amber-50 dark:bg-amber-955/20 border border-amber-100/50 px-1 rounded scale-90">
                              {dayEvents.length}
                            </span>
                          )}
                        </div>

                        {/* micro bullets list */}
                        <div className="space-y-0.5 max-h-[35px] md:max-h-[50px] overflow-hidden">
                          {dayEvents.slice(0, 3).map((item) => {
                            let statusDot = 'bg-blue-500';
                            if (item.status === 'Importante') statusDot = 'bg-red-500';
                            else if (item.status === 'Alerta') statusDot = 'bg-amber-500';

                            return (
                              <div
                                key={item.id}
                                className="flex items-center gap-1 p-0.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                                title={item.titulo}
                              >
                                <span className={`w-1 h-1 rounded-full shrink-0 ${statusDot}`} />
                                <span className="text-[7.5px] font-black text-slate-750 dark:text-slate-350 truncate uppercase leading-none block">
                                  {item.titulo}
                                </span>
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <p className="text-[6.5px] font-black text-slate-400 text-center uppercase tracking-widest leading-none">
                              +{dayEvents.length - 3} mais
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

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
