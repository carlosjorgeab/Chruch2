'use client';
import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useIgreja } from '@/context/IgrejaContext';
import { ShieldAlert } from 'lucide-react';
import { ConfirmProvider } from '@/context/ConfirmContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

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
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <Topbar />
        <main className="md:ml-64 pt-16 min-h-screen transition-all duration-300 flex items-center justify-center">
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

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
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
            
            /* Soft glassmorphism in topbar and sidebar as well! */
            header {
              background-color: color-mix(in srgb, var(--church-panel) 78%, transparent) !important;
              backdrop-filter: blur(14px) !important;
              -webkit-backdrop-filter: blur(14px) !important;
              border-bottom: 1px solid color-mix(in srgb, var(--church-border) 40%, transparent) !important;
            }
            aside {
              background-color: color-mix(in srgb, var(--church-panel) 84%, transparent) !important;
              backdrop-filter: blur(14px) !important;
              -webkit-backdrop-filter: blur(14px) !important;
              border-right: 1px solid color-mix(in srgb, var(--church-border) 40%, transparent) !important;
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
            main button.bg-amber-600,
            main button.bg-\\[\\#E4A232\\],
            main .bg-amber-600,
            main .bg-\\[\\#E4A232\\],
            main button.bg-primary,
            main .bg-primary {
              background-color: var(--church-button) !important;
              color: #ffffff !important;
              border-radius: 1rem !important;
            }

            main .text-amber-500,
            main .text-amber-600,
            main .text-amber-700,
            main .text-primary {
              color: var(--church-button) !important;
            }

            main .border-amber-500,
            main .border-primary,
            main .focus\\:border-amber-500:focus,
            main .focus\\:border-primary:focus {
              border-color: var(--church-button) !important;
            }
          ` }} />
        );
      })()}

      <main className="md:ml-64 pt-16 min-h-screen transition-all duration-300 relative z-10">
        {children}
      </main>
    </ConfirmProvider>
  );
}