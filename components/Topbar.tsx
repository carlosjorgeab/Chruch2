'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Search, Bell, UserCircle, ChevronDown, Building2, Settings, Users } from 'lucide-react';
import { useDeputado } from '@/context/DeputadoContext';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';

export function Topbar() {
  const { deputados, selectedDeputado, setSelectedDeputado } = useDeputado();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const isPublicRoute = pathname?.startsWith('/p/');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/busca?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="fixed top-0 w-full z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl flex justify-between items-center px-4 md:px-6 h-16 shadow-[0_12px_40px_rgba(0,156,59,0.05)]">
      <div className="flex items-center gap-2 md:gap-3 ml-10 md:ml-64">
        <Logo className="w-6 h-6 md:w-8 md:h-8 shrink-0" />
        <h1 className="text-base md:text-xl font-black tracking-tighter text-secondary dark:text-primary uppercase font-headline truncate max-w-[120px] md:max-w-none">Chruch Management</h1>
        <span className="hidden md:block h-4 w-[1px] bg-slate-200"></span>
        <span className="hidden md:block text-slate-500 font-medium text-sm">Painel do Parlamentar</span>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        {/* Deputado Selector - Only show if there are multiple deputies and not public route */}
        {!isPublicRoute && deputados.length > 1 && (
          <div className="relative flex items-center bg-white rounded-lg px-2 md:px-3 py-1.5 border border-slate-200 shadow-sm max-w-[120px] md:max-w-none">
            <select 
              className="bg-transparent border-none focus:ring-0 text-xs md:text-sm font-bold text-on-surface outline-none cursor-pointer appearance-none pr-6 w-full truncate"
              value={selectedDeputado?.id || ''}
              onChange={(e) => {
                const dep = deputados.find(d => d.id === e.target.value);
                setSelectedDeputado(dep || null);
              }}
            >
              <option value="" disabled>Selecione um Deputado</option>
              {deputados.map(dep => (
                <option key={dep.id} value={dep.id}>
                  {dep.nome} ({dep.partidos?.sigla}-{dep.estado}) {!dep.ativo ? '(Inativo)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 text-slate-400 pointer-events-none" />
          </div>
        )}

        {!isPublicRoute && (
          <>
            <form onSubmit={handleSearch} className="hidden lg:flex relative items-center bg-slate-100 dark:bg-slate-900 rounded-full px-4 py-1.5 w-64 border border-slate-200 dark:border-slate-800">
              <Search className="text-slate-400" size={16} />
              <input 
                className="bg-transparent border-none focus:ring-0 text-sm w-full font-body placeholder:text-slate-400 ml-2 outline-none" 
                placeholder="Buscar emendas e projetos..." 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
            <div className="relative group">
              <button className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-slate-100 dark:border-slate-800 hover:border-primary transition-all overflow-hidden bg-white dark:bg-slate-900 shadow-sm active:scale-95">
                <svg viewBox="0 0 24 24" className="w-full h-full">
                   <circle cx="12" cy="12" r="12" fill="#009C3B" />
                   <circle cx="12" cy="10" r="4" fill="#002776" />
                   <path d="M5 20C5 17 8 15 12 15C16 15 19 17 19 20" fill="#002776" />
                </svg>
              </button>
              
              {/* Profile Dropdown */}
              {!isPublicRoute && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-700 mb-2">
                    <p className="text-xs text-slate-400 uppercase font-black tracking-widest mb-1">Logado como</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.email || 'Parlamentar'}</p>
                  </div>
                  
                  {user?.is_admin && (
                    <>
                      <Link 
                        href="/perfis" 
                        className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-primary transition-colors"
                      >
                        <UserCircle size={16} />
                        <span>Perfil</span>
                      </Link>
                      <Link 
                        href="/usuarios" 
                        className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-primary transition-colors"
                      >
                        <Users size={16} />
                        <span>Usuário</span>
                      </Link>
                      <Link 
                        href="/configuracoes" 
                        className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-primary transition-colors"
                      >
                        <Settings size={16} />
                        <span>Configurações</span>
                      </Link>
                    </>
                  )}
                  
                  <button 
                    onClick={() => logout()}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-slate-50 dark:border-slate-700 mt-2"
                  >
                    <Settings size={16} className="rotate-45" /> 
                    <span>Sair</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
