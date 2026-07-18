'use client';

import { useState, useEffect, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Calendar, 
  Megaphone, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  Award,
  Clock,
  MapPin,
  Globe,
  Info
} from 'lucide-react';

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

export default function PublicChurchOverview() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [igreja, setIgreja] = useState<any>(null);
  const [muralAvisos, setMuralAvisos] = useState<any[]>([]);
  const [currentMuralIndex, setCurrentMuralIndex] = useState(0);
  const [aniversariantes, setAniversariantes] = useState<any[]>([]);
  const [agendas, setAgendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [churchError, setChurchError] = useState<string | null>(null);

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

  const getYouTubeEmbedUrl = (url: string | null | undefined) => {
    if (!url) return null;
    try {
      let videoId = '';
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('youtube.com/embed/')[1].split(/[?#]/)[0];
      } else if (url.includes('v=')) {
        videoId = url.split('v=')[1].split('&')[0];
      } else if (url.includes('video/')) {
        videoId = url.split('video/')[1].split(/[?#]/)[0];
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1` : null;
    } catch {
      return null;
    }
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

  const getActiveAvisos = () => {
    if (!muralAvisos) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return muralAvisos.filter((m) => {
      if (m.status !== 'Publicado') return false;

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

  // Automated transition of murais based on tempo_transicao
  useEffect(() => {
    const active = getActiveAvisos();
    if (active.length <= 1) return;

    const currentItem = active[currentMuralIndex];
    const delay = (currentItem?.tempo_transicao || 10) * 1000;

    const timer = setTimeout(() => {
      transitionToNext();
    }, delay);

    return () => clearTimeout(timer);
  }, [currentMuralIndex, muralAvisos]);

  // Listen to postMessage events from YouTube/Vimeo players
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        let data = event.data;
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        
        if (data?.event === 'onStateChange' && data?.info === 0) {
          transitionToNext();
        } else if (data?.info?.playerState === 0) {
          transitionToNext();
        }

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

  // Main data loader
  useEffect(() => {
    if (!slug) return;

    async function loadPublicData() {
      try {
        setLoading(true);
        setChurchError(null);

        // 1. Fetch church by slug
        const { data: churchData, error: errChurch } = await supabase
          .from('igrejas')
          .select('*')
          .eq('slug', slug.toLowerCase().trim())
          .eq('ativo', true)
          .maybeSingle();

        if (errChurch || !churchData) {
          setChurchError('Igreja não encontrada ou desativada.');
          setLoading(false);
          return;
        }

        setIgreja(churchData);
        const churchId = churchData.id;

        // 2. Fetch Mural de Avisos
        const { data: muralData, error: errMural } = await supabase
          .from('mural_avisos')
          .select('*')
          .eq('id_igreja', churchId)
          .eq('status', 'Publicado')
          .order('ordem', { ascending: true })
          .order('created_at', { ascending: false });

        if (!errMural && muralData) {
          setMuralAvisos(muralData);
        }

        // 3. Fetch active members born in the CURRENT month (Aniversariantes do Mês)
        const { data: membersData, error: errMembers } = await supabase
          .from('membros')
          .select('id, nome, foto_url, data_nascimento')
          .eq('id_igreja', churchId)
          .eq('status', 'Ativo')
          .not('data_nascimento', 'is', null);

        if (!errMembers && membersData) {
          const currentMonth = new Date().getMonth() + 1;
          const currentDay = new Date().getDate();

          const bdays = membersData.map((m: any) => {
            const birth = m.data_nascimento; // YYYY-MM-DD
            const parts = birth.split('-');
            if (parts.length < 3) return null;
            const bMonth = parseInt(parts[1], 10);
            const bDay = parseInt(parts[2], 10);

            if (bMonth !== currentMonth) return null;

            // Calculate daysLeft in the month
            let daysLeft = bDay - currentDay;
            return {
              ...m,
              bMonth,
              bDay,
              daysLeft
            };
          }).filter((m: any) => m !== null);

          // Sort by day of month ascending
          bdays.sort((a: any, b: any) => a.bDay - b.bDay);
          setAniversariantes(bdays);
        }

        // 4. Fetch Agendas (Public events only)
        const { data: agendaData, error: errAgenda } = await supabase
          .from('agendas')
          .select('*')
          .eq('id_igreja', churchId)
          .eq('privado', false)
          .order('data_hora', { ascending: true });

        if (!errAgenda && agendaData) {
          setAgendas(agendaData);
        }
      } catch (err) {
        console.error('Error compiling public dashboard:', err);
        setChurchError('Ocorreu um erro ao carregar as informações.');
      } finally {
        setLoading(false);
      }
    }

    loadPublicData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
        <RefreshCw className="animate-spin text-amber-500 mb-4" size={32} />
        <p className="font-semibold uppercase tracking-widest text-xs">Carregando painel público...</p>
      </div>
    );
  }

  if (churchError || !igreja) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-xl text-center space-y-6 border border-slate-100 dark:border-slate-800">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
            <Info size={32} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Página Não Disponível</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              {churchError || 'Esta igreja não foi encontrada ou seu acesso público está suspenso.'}
            </p>
          </div>
          <button 
            onClick={() => router.push('/')}
            className="w-full bg-slate-900 dark:bg-slate-800 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all uppercase text-xs tracking-widest cursor-pointer"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  // Visual Customizations variables
  const corFundo = igreja.cor_fundo;
  const corPaineis = igreja.cor_paineis;
  const corBordas = igreja.cor_bordas;
  const corFontes = igreja.cor_fontes;
  const corBotoes = igreja.cor_botoes;

  // Active slideshow item
  const activeAvisos = getActiveAvisos();
  const hasAvisos = activeAvisos.length > 0;

  // Render Calendar events list helper
  const getFilteredEvents = () => {
    if (viewType === 'dia') {
      // Show next 6 upcoming events starting from today
      const todayReset = new Date();
      todayReset.setHours(0, 0, 0, 0);
      return agendas.filter(item => new Date(item.data_hora) >= todayReset).slice(0, 6);
    } else if (viewType === 'semana') {
      const weekDays = getWeekDays(currentDate);
      const start = weekDays[0];
      const end = new Date(weekDays[6]);
      end.setHours(23, 59, 59, 999);

      return agendas.filter((item) => {
        const d = new Date(item.data_hora);
        return d >= start && d <= end;
      });
    } else {
      // Month
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

      return agendas.filter((item) => {
        const d = new Date(item.data_hora);
        return d >= start && d <= end;
      });
    }
  };

  const filteredEvents = getFilteredEvents();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --church-bg: ${corFundo || '#f8fafc'};
          --church-panel: ${corPaineis || '#ffffff'};
          --church-border: ${corBordas || '#e2e8f0'};
          --church-font: ${corFontes || '#0f172a'};
          --church-button: ${corBotoes || '#E4A232'};
        }
        
        .public-page-wrapper {
          background-color: var(--church-bg) !important;
          color: var(--church-font) !important;
        }

        .public-panel {
          background-color: var(--church-panel) !important;
          border-color: var(--church-border) !important;
        }

        .public-btn-primary {
          background-color: var(--church-button) !important;
          color: #ffffff !important;
        }
      `}} />

      <div className="public-page-wrapper min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header Block */}
          <header className="public-panel border rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-sm">
            <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
              {igreja.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={igreja.logo_url} 
                  alt={igreja.nome} 
                  className="w-16 h-16 object-contain rounded-2xl bg-white p-1 border border-slate-150"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 text-white font-sans font-black text-2xl flex items-center justify-center rounded-2xl shadow-md uppercase">
                  {igreja.nome.substring(0, 2)}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight">{igreja.nome}</h1>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5 justify-center sm:justify-start">
                  <Globe size={12} className="text-amber-500" /> Painel de Visão Geral Público
                </p>
              </div>
            </div>
            
            {/* Logo, date indicator or system watermark */}
            <div className="text-center sm:text-right">
              <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl">
                📅 {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </span>
            </div>
          </header>

          {/* Main Content Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* PANEL A: Mural de Avisos (6 Columns or Full width depending on active layouts) */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="public-panel border rounded-3xl p-6 sm:p-8 flex flex-col h-full justify-between gap-6 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div className="flex items-center gap-2">
                    <Megaphone className="text-amber-500 shrink-0" size={18} />
                    <h3 className="text-sm font-black uppercase tracking-wider">📢 Mural de Avisos</h3>
                  </div>
                  <p className="text-slate-400 text-[11px] font-medium">Fique por dentro das últimas notícias</p>
                </div>

                {!hasAvisos ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 dark:bg-slate-955/10 rounded-2xl border border-slate-100 dark:border-slate-850 min-h-[300px]">
                    <Megaphone className="text-slate-300 dark:text-slate-700 mb-3" size={32} />
                    <h4 className="text-xs font-bold uppercase tracking-tight text-slate-500">Nenhum aviso ativo no momento</h4>
                    <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                      As novidades e comunicados importantes aparecerão aqui assim que forem publicados.
                    </p>
                  </div>
                ) : (
                  (() => {
                    const item = activeAvisos[currentMuralIndex];
                    if (!item) return null;

                    const hasVideoLink = item.url_midia && (isYouTube(item.url_midia) || isVimeo(item.url_midia) || isDirectVideo(item.url_midia));
                    const isPdf = !hasVideoLink && item.arquivo_base64 && (
                      item.arquivo_base64.startsWith('data:application/pdf') || 
                      (item.arquivo_base64.startsWith('http') && (/\.pdf/i.test(item.arquivo_base64) || (item.arquivo_nome && /\.pdf$/i.test(item.arquivo_nome))))
                    );
                    const isImage = !hasVideoLink && item.arquivo_base64 && (
                      item.arquivo_base64.startsWith('data:image/') || 
                      (item.arquivo_base64.startsWith('http') && (!/\.pdf/i.test(item.arquivo_base64) && !(item.arquivo_nome && /\.pdf$/i.test(item.arquivo_nome))))
                    );

                    let frameHeightClass = "h-[220px] sm:h-[280px]";
                    if (isPdf) {
                      frameHeightClass = "h-[360px] sm:h-[450px]";
                    } else if (hasVideoLink) {
                      frameHeightClass = "aspect-video w-full h-auto max-h-[350px]";
                    } else if (isImage) {
                      frameHeightClass = "h-[260px] sm:h-[380px]";
                    }

                    return (
                      <div className="flex flex-col gap-4 flex-1 justify-between">
                        {(item.url_midia || item.arquivo_base64) && (
                          <div className={`w-full relative ${frameHeightClass} rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 shadow-inner flex flex-col justify-center items-center`}>
                            
                            {/* YouTube */}
                            {item.url_midia && isYouTube(item.url_midia) && getYouTubeEmbedUrl(item.url_midia) && (
                              <div className="w-full h-full relative bg-black">
                                <iframe
                                  src={getYouTubeEmbedUrl(item.url_midia)!}
                                  title="Player de Vídeo"
                                  className="absolute top-0 left-0 w-full h-full border-0"
                                  allowFullScreen
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                />
                              </div>
                            )}

                            {/* Vimeo */}
                            {item.url_midia && isVimeo(item.url_midia) && getVimeoEmbedUrl(item.url_midia) && (
                              <div className="w-full h-full relative bg-black">
                                <iframe
                                  src={getVimeoEmbedUrl(item.url_midia)!}
                                  title="Player Vimeo"
                                  className="absolute top-0 left-0 w-full h-full border-0"
                                  allowFullScreen
                                  allow="autoplay; fullscreen; picture-in-picture"
                                />
                              </div>
                            )}

                            {/* Direct Video */}
                            {item.url_midia && isDirectVideo(item.url_midia) && (
                              <video 
                                autoPlay 
                                muted 
                                playsInline 
                                controls 
                                className="w-full h-full bg-black object-contain"
                                onEnded={transitionToNext}
                              >
                                <source src={item.url_midia} />
                                Seu navegador não suporta vídeos HTML5.
                              </video>
                            )}

                            {/* Base64 Image */}
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
                                    className="w-full h-full object-contain transition-transform duration-350 group-hover:scale-[1.02]"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="public-btn-primary font-black text-[10px] px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg uppercase tracking-wider">
                                      <ExternalLink size={12} />
                                      Acessar Link Anexo
                                    </div>
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

                            {/* Base64 PDF */}
                            {!hasVideoLink && item.arquivo_base64 && isPdf && (
                              <div className="w-full h-full relative overflow-hidden rounded-2xl bg-white border border-slate-150 flex flex-col">
                                <iframe
                                  src={item.arquivo_base64.startsWith('data:') ? `${item.arquivo_base64.split('#')[0]}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH` : `${item.arquivo_base64}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                                  className="w-full h-full object-cover pointer-events-none select-none overflow-hidden"
                                  style={{ border: 0, overflow: 'hidden' }}
                                  title={item.titulo}
                                />
                                <div className="absolute inset-0 bg-transparent flex items-end justify-end p-3 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const win = window.open();
                                      if (win) {
                                        const basePdf = item.arquivo_base64 || '';
                                        const pdfUrl = basePdf.startsWith('data:') ? (basePdf.includes('#') ? basePdf.split('#')[0] : basePdf) : basePdf;
                                        win.document.write(
                                          `<title>PDF - ${item.arquivo_nome || 'Mural'}</title>` +
                                          `<iframe src="${pdfUrl}#page=1&toolbar=0&navpanes=0" frameborder="0" style="border:0; position:fixed; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`
                                        );
                                      }
                                    }}
                                    className="public-btn-primary text-[9px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md hover:scale-105 transition cursor-pointer"
                                  >
                                    <ExternalLink size={11} /> Expandir / Visualizar
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Simple Link */}
                            {!hasVideoLink && item.url_midia && !item.arquivo_base64 && (
                              <div className="p-6 text-center space-y-3 flex flex-col justify-center items-center h-full w-full">
                                <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-500 rounded-xl">
                                  <ExternalLink size={24} />
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Link anexado:</p>
                                <a
                                  href={item.url_midia}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-amber-500 hover:underline text-sm font-black max-w-[250px] truncate"
                                >
                                  {item.url_midia}
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex flex-col gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <h4 className="text-base font-black uppercase tracking-tight leading-normal line-clamp-2">
                            {item.titulo}
                          </h4>

                          {activeAvisos.length > 1 && (
                            <div className="flex items-center justify-between gap-2 mt-2">
                              <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 px-2 py-1 rounded-md flex items-center gap-1">
                                ⏱️ {item.tempo_transicao || 10}s
                              </span>

                              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-1 rounded-lg">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const nextIndex = currentMuralIndex === 0 ? activeAvisos.length - 1 : currentMuralIndex - 1;
                                    setCurrentMuralIndex(nextIndex);
                                  }}
                                  className="p-1 px-2.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
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
                                  className="p-1 px-2.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
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

            {/* PANEL B: Aniversariantes do Mês (6 Columns) */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="public-panel border rounded-3xl p-6 sm:p-8 flex flex-col h-full justify-between gap-6 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div className="flex items-center gap-2">
                    <Calendar className="text-amber-500 shrink-0" size={18} />
                    <h3 className="text-sm font-black uppercase tracking-wider">🎉 Aniversariantes do Mês</h3>
                  </div>
                  <p className="text-slate-400 text-[11px] font-medium">Deixe seus votos de felicidade e orações</p>
                </div>

                {aniversariantes.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 dark:bg-slate-955/10 rounded-2xl border border-slate-150 dark:border-slate-850 min-h-[300px]">
                    <Award className="text-slate-300 dark:text-slate-700 mb-3" size={32} />
                    <h4 className="text-xs font-bold uppercase tracking-tight text-slate-500">Nenhum aniversário este mês</h4>
                    <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                      Não há aniversariantes registrados ou ativos no mês corrente.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto max-h-[460px] pr-2 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                    {aniversariantes.map((membro) => {
                      const birthDay = memberBirthdayString(membro.bDay, membro.bMonth);
                      const isToday = membro.daysLeft === 0;

                      return (
                        <div
                          key={membro.id}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-950/20 border border-slate-150/40 dark:border-slate-850/60 hover:bg-amber-500/5 transition duration-200 group"
                        >
                          <div className="flex items-center gap-3.5">
                            {membro.foto_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={membro.foto_url}
                                alt={membro.nome}
                                className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-850 shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-amber-500 flex items-center justify-center font-black text-sm uppercase">
                                {membro.nome.substring(0, 2)}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-black leading-tight group-hover:text-amber-550 transition-colors">
                                {membro.nome}
                              </p>
                              <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-1">
                                🍰 {birthDay}
                              </p>
                            </div>
                          </div>

                          <div>
                            {isToday ? (
                              <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-emerald-200/50 dark:border-emerald-800/30 animate-pulse">
                                É hoje! 🎂🎈
                              </span>
                            ) : (
                              <span className="bg-slate-150/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                {membro.bDay} de {monthNamesPT[membro.bMonth - 1]}
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

            {/* PANEL C: Agenda da Igreja (Full width - 12 Columns) */}
            <div className="lg:col-span-12 flex flex-col">
              <div className="public-panel border rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar className="text-amber-500 shrink-0" size={18} />
                      <h3 className="text-sm font-black uppercase tracking-wider">📅 Agenda da Igreja</h3>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-1 font-medium">Cultos, reuniões, conferências e atividades da comunidade</p>
                  </div>

                  {/* Segmented view switcher */}
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700 shadow-inner w-full sm:w-auto justify-center">
                    {(['dia', 'semana', 'mes'] as const).map((vt) => (
                      <button
                        key={vt}
                        onClick={() => setViewType(vt)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                          viewType === vt
                            ? 'public-btn-primary shadow-md'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-amber-500'
                        }`}
                      >
                        {vt === 'dia' ? 'Dia a Dia' : vt === 'semana' ? 'Semanal' : 'Mensal'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calendar controls for week/month */}
                {viewType !== 'dia' && (
                  <div className="flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-2xl border border-slate-150/40 dark:border-slate-850/50">
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
                        className="p-1.5 px-3 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-extrabold text-[10px] cursor-pointer"
                      >
                        ◀
                      </button>
                      <span className="text-[10px] font-black uppercase tracking-widest min-w-[130px] text-center">
                        {viewType === 'semana' ? (
                          `Semana: ${getStartOfWeek(currentDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
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
                        className="p-1.5 px-3 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-extrabold text-[10px] cursor-pointer"
                      >
                        ▶
                      </button>
                    </div>

                    <button
                      onClick={() => setCurrentDate(new Date())}
                      className="p-1.5 px-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/40 rounded-lg font-black text-[9px] uppercase tracking-wider cursor-pointer"
                    >
                      Hoje
                    </button>
                  </div>
                )}

                {filteredEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-12 bg-slate-50/50 dark:bg-slate-955/10 rounded-2xl border border-slate-150 dark:border-slate-850 min-h-[160px]">
                    <Calendar className="text-slate-300 dark:text-slate-700 mb-3" size={32} />
                    <h4 className="text-xs font-bold uppercase tracking-tight text-slate-500">Nenhum compromisso agendado</h4>
                    <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                      Não há atividades ou programações marcadas para este período.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.map((item) => {
                      const eventDate = new Date(item.data_hora);
                      
                      let badgeColor = "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200/50";
                      let borderStyle = "border-slate-150 dark:border-slate-800/80";
                      
                      if (item.status === 'Importante') {
                        badgeColor = "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200/50";
                        borderStyle = "border-red-200/30 dark:border-red-900/30";
                      } else if (item.status === 'Alerta') {
                        badgeColor = "bg-amber-50 text-amber-700 dark:bg-amber-955/20 dark:text-amber-450 border-amber-200/50";
                        borderStyle = "border-amber-200/30 dark:border-amber-900/30";
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
                          className={`p-5 rounded-2xl border bg-slate-50/50 dark:bg-slate-950/20 flex flex-col justify-between gap-4 hover:scale-[1.01] transition duration-200 ${borderStyle}`}
                        >
                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${badgeColor}`}>
                                {item.status || 'Normal'}
                              </span>
                              
                              <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                <Clock size={11} className="text-amber-500" /> {timeLabel}
                              </span>
                            </div>

                            <h4 className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">
                              {item.titulo}
                            </h4>
                          </div>

                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
                            <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
                              📅 {dateLabel}
                            </p>
                            {item.local && (
                              <p className="text-[10px] text-slate-450 font-bold flex items-center gap-1.5 truncate" title={item.local}>
                                <MapPin size={11} className="text-amber-500 shrink-0" /> {item.local}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Footer watermark */}
          <footer className="text-center pt-4 pb-8">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Powered by Supremme &copy; {new Date().getFullYear()}
            </p>
          </footer>

        </div>
      </div>
    </>
  );
}
