'use client';
import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { Menu, X, Bell, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useIgreja } from '@/context/IgrejaContext';
import { ShieldAlert } from 'lucide-react';
import { ConfirmProvider } from '@/context/ConfirmContext';
import { supabase } from '@/lib/supabase';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { user, loading, hasPermission } = useAuth();
  const { selectedIgreja, loading: depLoading } = useIgreja();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Run DB migrations automatically in background
    fetch('/api/migrate').catch(err => console.error('Auto migration failed:', err));

    const savedDark = localStorage.getItem('theme') === 'dark';
    if (savedDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const savedCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    setIsSidebarCollapsed(savedCollapsed);

    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Event reminders background worker
  const [activeReminders, setActiveReminders] = useState<any[]>([]);
  const [dismissedReminders, setDismissedReminders] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedIgreja?.id) return;

    const checkReminders = async () => {
      try {
        const now = new Date();
        const futureLimit = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Check within 24 hours

        const { data: upcomingEvents, error } = await supabase
          .from('agendas')
          .select('*')
          .eq('id_igreja', selectedIgreja.id)
          .gte('data_hora', now.toISOString())
          .lte('data_hora', futureLimit.toISOString())
          .not('tempo_lembrete', 'is', null);

        if (error) {
          console.error('Error fetching reminders:', error);
          return;
        }

        if (!upcomingEvents) return;

        const alertsToTrigger: any[] = [];
        upcomingEvents.forEach((event: any) => {
          if (dismissedReminders.includes(event.id)) return;

          const eventTime = new Date(event.data_hora).getTime();
          const curTime = now.getTime();
          const diffMs = eventTime - curTime;
          const diffMins = Math.floor(diffMs / (60 * 1000));

          // Trigger warning if within the user-defined tempo_lembrete minutes, up to the start time (inclusive)
          if (diffMins >= 0 && diffMins <= (event.tempo_lembrete || 15)) {
            alertsToTrigger.push(event);
          }
        });

        setActiveReminders(alertsToTrigger);
      } catch (err) {
        console.error('Error running reminder worker:', err);
      }
    };

    // Check once immediately and then poll every 60 seconds (1 minute)
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [selectedIgreja?.id, dismissedReminders]);

  const toggleSidebarCollapse = () => {
    const newVal = !isSidebarCollapsed;
    setIsSidebarCollapsed(newVal);
    localStorage.setItem('sidebar_collapsed', String(newVal));
  };

  if (!mounted || loading || depLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">Carregando...</div>;
  }

  if (!user) {
    return null; // Will redirect in AuthContext
  }

  // If NOT master, NOT admin and NO selected igreja (meaning inactive or not assigned)
  if (!user.id_master && !user.is_admin && !selectedIgreja) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl text-center space-y-8 border border-slate-100">
          <div className="w-24 h-24 bg-transparent text-red-500 rounded-3xl flex items-center justify-center mx-auto rotate-3 shadow-inner">
            <ShieldAlert size={48} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 leading-tight">Acesso Suspenso</h1>
            <p className="text-slate-500 mt-4 font-medium leading-relaxed">
              A igreja selecionada está <span className="text-red-500 font-bold uppercase underline">Inativa</span>. Por favor, entre em contato com o administrador do sistema para mais informações.
            </p>
          </div>
          <button 
            onClick={() => router.push('/login')}
            className="w-full bg-slate-900 text-white font-bold py-5 rounded-2xl hover:opacity-90 transition-all uppercase text-xs tracking-widest shadow-xl shadow-slate-200"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  // Check if user has permission for the current route
  const baseRoute = '/' + pathname?.split('/')[1];
  if (baseRoute !== '/' && !hasPermission(baseRoute)) {
    return (
      <>
        <Sidebar 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          isCollapsed={isSidebarCollapsed} 
          onToggleCollapse={toggleSidebarCollapse} 
        />
        <Topbar />
        <main className={`${isSidebarCollapsed ? 'md:ml-0' : 'md:ml-64'} pt-16 min-h-screen transition-all duration-300 flex items-center justify-center`}>
          <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Acesso Negado</h2>
            <p className="text-slate-500 dark:text-slate-400">Você não tem permissão para acessar esta página.</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <ConfirmProvider>
      {/* Premium ambient cloud/sky background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-gradient-to-tr from-sky-150 via-slate-50 to-indigo-100/60 dark:from-slate-950 dark:via-slate-900/40 dark:to-slate-950">
        {/* Soft, floating visual sky cloud layers */}
        <div className="absolute top-[5%] left-[10%] w-[35rem] h-[35rem] bg-sky-200/50 dark:bg-sky-900/10 rounded-full filter blur-[120px] animate-pulse" style={{ animationDuration: '18s' }} />
        <div className="absolute bottom-[10%] right-[10%] w-[45rem] h-[45rem] bg-indigo-150/40 dark:bg-indigo-950/5 rounded-full filter blur-[140px] animate-pulse" style={{ animationDuration: '24s' }} />
        <div className="absolute top-[40%] left-[45%] w-[25rem] h-[25rem] bg-pink-100/30 dark:bg-purple-950/5 rounded-full filter blur-[100px] animate-pulse" style={{ animationDuration: '14s' }} />

        {/* CSS Subtle Cloud Shapes */}
        <div className="absolute top-[8%] right-[20%] opacity-20 dark:opacity-5 text-sky-300">
          <svg className="w-96 h-auto" viewBox="0 0 100 60" fill="currentColor">
            <path d="M10 40a15 15 0 0 1 30 0a12 12 0 0 1 24 0a15 15 0 0 1 26-3a15 15 0 0 1 -4 23h-76a15 15 0 0 1 -10-20z" opacity="0.4" />
          </svg>
        </div>
        <div className="absolute bottom-[15%] left-[5%] opacity-15 dark:opacity-5 text-indigo-200">
          <svg className="w-[30rem] h-auto" viewBox="0 0 100 60" fill="currentColor">
            <path d="M10 40a15 15 0 0 1 30 0a12 12 0 0 1 24 0a15 15 0 0 1 26-3a15 15 0 0 1 -4 23h-76a15 15 0 0 1 -10-20z" opacity="0.3" />
          </svg>
        </div>
      </div>

      {/* Mobile Menu Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-3 left-4 z-[60] p-2 bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 text-slate-700"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        isCollapsed={isSidebarCollapsed} 
        onToggleCollapse={toggleSidebarCollapse} 
      />
      <Topbar />
      
      {(() => {
        const corFundo = (selectedIgreja as any)?.cor_fundo;
        const corPaineis = (selectedIgreja as any)?.cor_paineis;
        const corBordas = (selectedIgreja as any)?.cor_bordas;
        const corFontes = (selectedIgreja as any)?.cor_fontes;
        const corBotoes = (selectedIgreja as any)?.cor_botoes;

        return (
          <style dangerouslySetInnerHTML={{ __html: `
            :root {
              --church-bg: ${corFundo || 'transparent'};
              --church-panel: ${corPaineis || '#ffffff'};
              --church-border: ${corBordas || '#e2e8f0'};
              --church-font: ${corFontes || '#0f172a'};
              --church-button: ${corBotoes || '#E4A232'};
            }
            .dark {
              --church-bg: ${corFundo ? `color-mix(in srgb, ${corFundo} 30%, #030712)` : 'transparent'};
              --church-panel: ${corPaineis || '#0f172a'};
              --church-border: ${corBordas || '#1e293b'};
              --church-font: ${corFontes || '#f8fafc'};
              --church-button: ${corBotoes || '#E4A232'};
            }
            
            /* Main content area overrides */
            main {
              background-color: var(--church-bg) !important;
              color: var(--church-font) !important;
            }
            
            /* High-end Glassmorphic Panels/Cards overrides with custom curves */
            main .bg-white,
            main [class*="bg-white/"],
            main .bg-slate-50,
            main .dark\\:bg-slate-800,
            main .dark\\:bg-slate-900,
            main .bg-slate-100 {
              background-color: color-mix(in srgb, var(--church-panel) 82%, transparent) !important;
              backdrop-filter: blur(20px) !important;
              -webkit-backdrop-filter: blur(20px) !important;
              border-radius: 1.75rem !important; /* Premium rounded-3xl/2xl look */
              box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.4) !important;
            }

            .dark main .bg-white,
            .dark main [class*="bg-white/"],
            .dark main .bg-slate-50,
            .dark main .dark\\:bg-slate-800,
            .dark main .dark\\:bg-slate-900,
            .dark main .bg-slate-100 {
              background-color: color-mix(in srgb, var(--church-panel) 72%, transparent) !important;
              backdrop-filter: blur(20px) !important;
              -webkit-backdrop-filter: blur(20px) !important;
              box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.05) !important;
            }
            
            /* Sidebar and Topbar backgrounds and borders */
            header {
              background-color: #88B0BF !important;
              backdrop-filter: none !important;
              -webkit-backdrop-filter: none !important;
              border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
            }
            aside {
              background-color: #88B0BF !important;
              backdrop-filter: none !important;
              -webkit-backdrop-filter: none !important;
              border-right: 1px solid rgba(255, 255, 255, 0.2) !important;
            }
            .dark header {
              background-color: #3B758C !important;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
            }
            .dark aside {
              background-color: #3B758C !important;
              border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
            }

            /* Enforce bold and white fonts in topbar and sidebar */
            header p,
            header span,
            header h2,
            aside p,
            aside span,
            aside h2,
            aside h3,
            aside button,
            aside a {
              color: #ffffff !important;
              font-weight: 700 !important;
            }

            /* Enforce black and bold font for Church combo and Search input */
            header select,
            header input {
              color: #000000 !important;
              font-weight: 700 !important;
              background-color: transparent !important;
            }
            
            /* Enforce white background for Church combo container and Search bar in both themes */
            header div.relative.flex.items-center,
            header form.hidden.lg\\:flex {
              background-color: #ffffff !important;
              border-color: rgba(0, 0, 0, 0.15) !important;
            }
            
            /* Icons inside these white containers should be dark gray for legibility */
            header div.relative.flex.items-center svg,
            header form.hidden.lg\\:flex svg {
              color: #475569 !important;
              stroke: #475569 !important;
            }

            /* Active menu item should keep white font and look elegant */
            aside a.bg-\[\#E4A232\],
            aside a.bg-primary {
              background-color: rgba(255, 255, 255, 0.25) !important;
              color: #ffffff !important;
            }

            /* Custom hover backgrounds for links/buttons inside sidebar and topbar */
            aside a:hover,
            aside button:hover {
              background-color: rgba(255, 255, 255, 0.15) !important;
              color: #ffffff !important;
            }

            /* Enforce white icons */
            header svg,
            aside svg {
              color: #ffffff !important;
              stroke: #ffffff !important;
            }

            /* Search input placeholder style */
            header input::placeholder {
              color: rgba(0, 0, 0, 0.5) !important;
              font-weight: 700 !important;
            }

            /* Dropdowns and popovers inside header should keep their standard readable styling */
            header [class*="absolute"] p,
            header [class*="absolute"] span,
            header [class*="absolute"] a,
            header [class*="absolute"] button {
              color: var(--church-font) !important;
              font-weight: 500 !important;
            }
            .dark header [class*="absolute"] p,
            .dark header [class*="absolute"] span,
            .dark header [class*="absolute"] a,
            .dark header [class*="absolute"] button {
              color: #f3f4f6 !important;
              font-weight: 500 !important;
            }
            header [class*="absolute"] svg {
              color: var(--church-font) !important;
              stroke: var(--church-font) !important;
            }
            .dark header [class*="absolute"] svg {
              color: #f3f4f6 !important;
              stroke: #f3f4f6 !important;
            }
            header select option {
              background-color: #ffffff !important;
              color: #000000 !important;
              font-weight: 700 !important;
            }
            .dark header select option {
              background-color: #1e293b !important;
              color: #ffffff !important;
              font-weight: 700 !important;
            }
            
            /* Borders overrides */
            main .border,
            main .border-slate-100,
            main .border-slate-200,
            main .dark\\:border-slate-700,
            main .dark\\:border-slate-800 {
              border-color: color-mix(in srgb, var(--church-border) 45%, transparent) !important;
            }
            
            /* Fonts overrides */
            main h1,
            main h2,
            main h3,
            main h4,
            main h5,
            main p,
            main label,
            main .text-slate-950,
            main .text-slate-900,
            main .text-slate-800,
            main .text-slate-700,
            main .text-slate-600,
            main .dark\\:text-white,
            main .dark\\:text-slate-100,
            main .dark\\:text-slate-200,
            main .dark\\:text-slate-300 {
              color: var(--church-font) !important;
            }

            /* Buttons & Amber Accent Overrides */
            aside .bg-\\[\\#E4A232\\],
            main button.bg-amber-500,
            main button.bg-amber-600,
            main button.bg-\\[\\#E4A232\\],
            main .bg-amber-500,
            main .bg-amber-600,
            main .bg-\\[\\#E4A232\\],
            main button.bg-primary,
            main .bg-primary {
              background-color: var(--church-button) !important;
              color: #ffffff !important;
              border-radius: 1rem !important;
            }

            main button.bg-amber-500:hover,
            main button.bg-amber-600:hover,
            main button.bg-\\[\\#E4A232\\]:hover,
            main button.bg-primary:hover {
              filter: brightness(0.9) !important;
            }

            main .text-amber-500,
            main .text-amber-600,
            main .text-amber-700,
            main .text-primary {
              color: var(--church-button) !important;
            }

            main .border-amber-550,
            main .border-primary,
            main .focus\\:border-amber-500:focus,
            main .focus\\:border-primary:focus,
            main input:focus,
            main select:focus,
            main textarea:focus {
              border-color: var(--church-button) !important;
            }
          ` }} />
        );
      })()}

      <main className={`${isSidebarCollapsed ? 'md:ml-0' : 'md:ml-64'} pt-16 min-h-screen transition-all duration-300 relative z-10`}>
        {children}
      </main>

      {/* Floating Menu button to restore sidebar when collapsed (only on desktop) */}
      {isSidebarCollapsed && (
        <button
          type="button"
          onClick={toggleSidebarCollapse}
          className="hidden md:flex fixed bottom-5 left-5 z-[55] p-3.5 bg-[#E4A232] text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20"
          title="Mostrar Menu"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Floating Active Event Reminders / Alertas Visuais de Agenda */}
      {activeReminders.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full animate-in slide-in-from-bottom duration-300 p-4 sm:p-0">
          {activeReminders.map((event) => {
            const eventTime = new Date(event.data_hora);
            const minutesLeft = Math.max(0, Math.floor((eventTime.getTime() - Date.now()) / 60000));

            return (
              <div 
                key={event.id}
                className="bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-3xl p-4 shadow-2xl relative overflow-hidden flex items-start gap-3.5 animate-pulse"
                style={{ animationDuration: '3s' }}
              >
                <div className="p-2.5 bg-amber-500/10 rounded-2xl text-[#E4A232] shrink-0">
                  <Bell size={20} className="animate-bounce" />
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">Lembrete de Compromisso</span>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight truncate mt-0.5">
                    {event.titulo}
                  </h4>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-snug mt-1">
                    Inicia em <span className="text-amber-550 font-black">{minutesLeft} minutos</span> às {eventTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
                  </p>
                  
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        setDismissedReminders(prev => [...prev, event.id]);
                        setActiveReminders(prev => prev.filter(r => r.id !== event.id));
                      }}
                      className="px-3 py-1.5 bg-amber-500 text-white font-black text-[9px] uppercase tracking-wider rounded-xl hover:bg-amber-600 transition cursor-pointer"
                    >
                      Ciente
                    </button>
                    <button
                      onClick={() => {
                        router.push('/agenda');
                        setDismissedReminders(prev => [...prev, event.id]);
                        setActiveReminders(prev => prev.filter(r => r.id !== event.id));
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 font-black text-[9px] uppercase tracking-wider rounded-xl transition cursor-pointer"
                    >
                      Ver Agenda
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setDismissedReminders(prev => [...prev, event.id]);
                    setActiveReminders(prev => prev.filter(r => r.id !== event.id));
                  }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 transition absolute top-3 right-3 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ConfirmProvider>
  );
}