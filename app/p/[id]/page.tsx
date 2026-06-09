'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Home from '@/app/(dashboard)/page';
import MapaPage from '@/app/(dashboard)/mapa/page';
import { LayoutDashboard, MapPin } from 'lucide-react';
import { Logo } from '@/components/Logo';

import { useDeputado } from '@/context/DeputadoContext';
import { AlertTriangle } from 'lucide-react';

export default function PublicHome() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams?.get('tab');
  const [activeTab, setActiveTab] = useState<'geral' | 'mapa'>(tabParam === 'mapa' ? 'mapa' : 'geral');
  const { selectedDeputado, loading: depLoading } = useDeputado();

  useEffect(() => {
    if (tabParam === 'mapa') setActiveTab('mapa');
    else setActiveTab('geral');
  }, [tabParam]);

  const handleTabChange = (tab: 'geral' | 'mapa') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('tab', tab);
    router.replace(`?${params.toString()}`);
  };

  if (!depLoading && !selectedDeputado) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={40} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-tight">Página Indisponível</h1>
            <p className="text-slate-500 mt-2 font-medium">Este perfil parlamentar não está ativo ou não foi encontrado em nossa base de dados.</p>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-all uppercase text-xs tracking-widest"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Custom Header for Public View */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Logo className="w-8 h-8 text-primary" />
             <div className="flex flex-col">
                <h1 className="text-sm font-black uppercase tracking-tighter text-primary leading-none">Chruch Management</h1>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Sistema Parlamentar</span>
             </div>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl shadow-inner">
            <button 
              onClick={() => handleTabChange('geral')}
              className={`flex items-center gap-3 px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-300 ${
                activeTab === 'geral' 
                ? 'bg-white dark:bg-slate-700 text-primary shadow-lg shadow-primary/10 scale-105' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <LayoutDashboard size={18} className={activeTab === 'geral' ? 'text-primary' : 'text-slate-400'} />
              <span className="hidden md:inline">Visão Geral</span>
            </button>
            <button 
              onClick={() => handleTabChange('mapa')}
              className={`flex items-center gap-3 px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-300 ${
                activeTab === 'mapa' 
                ? 'bg-white dark:bg-slate-700 text-primary shadow-lg shadow-primary/10 scale-105' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <MapPin size={18} className={activeTab === 'mapa' ? 'text-primary' : 'text-slate-400'} />
              <span className="hidden md:inline">Visão Mapa</span>
            </button>
            <button 
              onClick={() => {
                if (selectedDeputado) {
                  router.push(`/p/${selectedDeputado.slug || selectedDeputado.id}/projetos`);
                }
              }}
              className="flex items-center gap-3 px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-300 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
              <span className="hidden md:inline">Projetos</span>
            </button>
          </div>

          <div className="hidden lg:block">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
              Transparência Parlamentar
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-slate-50 dark:bg-slate-950">
        {activeTab === 'geral' ? (
          <div className="animate-in fade-in duration-500">
            <Home />
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            <MapaPage />
          </div>
        )}
      </main>
      
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-center">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Chruch Management &copy; {new Date().getFullYear()} - Todos os direitos reservados
         </p>
      </footer>
    </div>
  );
}
