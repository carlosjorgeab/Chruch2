'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Search, Bell, UserCircle, ChevronDown, Building2, Settings, Users, LogOut } from 'lucide-react';
import { useIgreja } from '@/context/IgrejaContext';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { useLanguage } from '@/context/LanguageContext';

export function Topbar() {
  const { igrejas, selectedIgreja, setSelectedIgreja } = useIgreja();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/busca?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="fixed top-0 w-full z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl flex justify-between items-center px-4 md:px-6 h-16 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 md:gap-3 ml-10 md:ml-64">
        <Logo className="w-6 h-6 md:w-8 md:h-8 shrink-0" />
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {igrejas.length > 1 && (
          <div className="relative flex items-center bg-white dark:bg-slate-900 rounded-lg px-2 md:px-3 py-1.5 border border-slate-200 dark:border-slate-800 shadow-sm max-w-[120px] md:max-w-none">
            <select 
              className="bg-transparent border-none focus:ring-0 text-xs md:text-sm font-bold text-slate-800 dark:text-white outline-none cursor-pointer appearance-none pr-6 w-full truncate"
              value={selectedIgreja?.id || ''}
              onChange={(e) => {
                const ig = igrejas.find(d => d.id === e.target.value);
                setSelectedIgreja(ig || null);
              }}
            >
              <option value="" disabled className="bg-white dark:bg-slate-900">{t('select_church') || 'Selecione uma Igreja'}</option>
              {igrejas.map(ig => (
                <option key={ig.id} value={ig.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                  {ig.nome} {!ig.ativo ? '(Inativa)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 text-slate-400 pointer-events-none" />
          </div>
        )}

        <form onSubmit={handleSearch} className="hidden lg:flex relative items-center bg-slate-100 dark:bg-slate-900 rounded-full px-4 py-1.5 w-64 border border-slate-200 dark:border-slate-800">
          <Search className="text-slate-400" size={16} />
          <input 
            className="bg-transparent border-none focus:ring-0 text-sm w-full font-body placeholder:text-slate-400 ml-2 outline-none text-slate-800 dark:text-white" 
            placeholder={t('search_placeholder') || 'Buscar...'} 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <button className="p-2 relative text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>
        </button>

        <div className="relative group">
          <div className="flex items-center gap-3 pl-3 md:pl-5 border-l border-slate-200 dark:border-slate-800 cursor-pointer">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight truncate max-w-[120px]">{user?.email || 'Usuário'}</p>
              <p className="text-xs text-slate-500 group-hover:text-amber-500 transition-colors">{user?.perfil?.nome || 'Membro'}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-200 dark:border-slate-700">
               <UserCircle size={24} />
            </div>
          </div>
          
          {/* Profile Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-700 mb-2">
              <p className="text-xs text-slate-400 uppercase font-black tracking-widest mb-1">Conta</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.email}</p>
            </div>
            
            {user?.is_admin && (
              <>
                <Link 
                  href="/perfis" 
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-amber-500 transition-colors"
                >
                  <UserCircle size={16} />
                  <span>{t('menu_perfis') || 'Perfis'}</span>
                </Link>
                <Link 
                  href="/usuarios" 
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-amber-500 transition-colors"
                >
                  <Users size={16} />
                  <span>{t('menu_usuarios') || 'Usuários'}</span>
                </Link>
                <Link 
                  href="/configuracoes" 
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-amber-500 transition-colors"
                >
                  <Settings size={16} />
                  <span>{t('menu_configuracoes') || 'Configurações'}</span>
                </Link>
              </>
            )}
            
            <button 
              onClick={() => logout()}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-slate-50 dark:border-slate-700 mt-2 font-bold"
            >
              <LogOut size={16} /> 
              <span>{t('logout') || 'Sair'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
