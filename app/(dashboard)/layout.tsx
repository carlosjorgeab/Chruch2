'use client';
import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useDeputado } from '@/context/DeputadoContext';
import { ShieldAlert } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, loading, hasPermission } = useAuth();
  const { selectedDeputado, loading: depLoading } = useDeputado();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || loading || depLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">Carregando...</div>;
  }

  if (!user) {
    return null; // Will redirect in AuthContext
  }

  // If NOT admin and NO selected deputado (meaning inactive or not assigned)
  if (!user.is_admin && !selectedDeputado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl text-center space-y-8 border border-slate-100">
          <div className="w-24 h-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto rotate-3 shadow-inner">
            <ShieldAlert size={48} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 leading-tight">Acesso Suspenso</h1>
            <p className="text-slate-500 mt-4 font-medium leading-relaxed">
              O mandato selecionado está <span className="text-red-500 font-bold uppercase underline">Inativo</span>. Por favor, entre em contato com o administrador do sistema para mais informações.
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
    <>
      {/* Mobile Menu Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-3 left-4 z-[60] p-2 bg-white rounded-md shadow-sm border border-slate-200 text-slate-700"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <Topbar />
      <main className="md:ml-64 pt-16 min-h-screen transition-all duration-300">
        {children}
      </main>
    </>
  );
}
