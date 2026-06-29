'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, UsersRound, BookOpen, ClipboardCheck, Wallet, Settings, LogOut, Shield, Building, Briefcase, Megaphone, Calendar, Ticket } from 'lucide-react';
import { useIgreja } from '@/context/IgrejaContext';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { useLanguage } from '@/context/LanguageContext';

export function Sidebar({ isOpen = false, setIsOpen }: { isOpen?: boolean, setIsOpen?: (v: boolean) => void }) {
  const pathname = usePathname();
  const { selectedIgreja } = useIgreja();
  const { logout, hasPermission, user } = useAuth();
  const { t } = useLanguage();

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: t('menu_dashboard'), disabled: false, id: '/' },
    { href: '/membros', icon: Users, label: t('menu_membros'), disabled: false, id: '/membros' },
    { href: '/comunidades', icon: UsersRound, label: t('menu_comunidades'), disabled: false, id: '/comunidades' },
    { href: '/agenda', icon: Calendar, label: 'Agenda da Igreja', disabled: false, id: '/agenda' },
    { href: '/eventos', icon: Ticket, label: 'Eventos', disabled: false, id: '/eventos' },
    { href: '/mural', icon: Megaphone, label: t('menu_mural'), disabled: false, id: '/mural' },
    { href: '/licoes', icon: BookOpen, label: t('menu_licoes'), disabled: false, id: '/licoes' },
    { href: '/presencas', icon: ClipboardCheck, label: t('menu_presencas'), disabled: false, id: '/presencas' },
    { href: '/financeiro', icon: Wallet, label: t('menu_financeiro'), disabled: false, id: '/financeiro' },
    { href: '/fornecedores', icon: Briefcase, label: 'Fornecedores', disabled: false, id: '/fornecedores' },
    { href: '/igrejas', icon: Building, label: t('menu_igrejas'), disabled: false, id: '/igrejas' },
    { href: '/perfis', icon: Shield, label: t('menu_perfis'), disabled: false, id: '/perfis' },
    { href: '/usuarios', icon: Users, label: t('menu_usuarios'), disabled: false, id: '/usuarios' },
    { href: '/configuracoes', icon: Settings, label: t('menu_configuracoes'), disabled: false, id: '/configuracoes' },
  ].filter(item => {
    if (user?.id_master) return true;
    if (user?.is_admin) {
      if (item.id === '/igrejas' || item.id === '/configuracoes') {
        return false;
      }
      return true;
    }
    // Regular users cannot access these system/admin modules
    if (item.id === '/igrejas' || item.id === '/configuracoes' || item.id === '/perfis' || item.id === '/usuarios') {
      return false;
    }
    return hasPermission(item.id);
  });

  const handleLogout = async () => {
    logout();
  };

  return (
    <aside className={`h-screen w-64 fixed left-0 top-0 pt-16 z-50 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white flex flex-col justify-between py-6 border-r border-slate-200 dark:border-slate-800 font-['Inter'] text-sm font-medium transition-all duration-300 overflow-y-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="px-4 space-y-2">
        <div className="mb-8 px-2 flex items-center gap-3 justify-between">
          <div className="h-12 w-12 rounded-xl bg-[#E4A232] flex items-center justify-end text-white flex-shrink-0 shadow-md overflow-hidden">
            {selectedIgreja?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                alt={`Logo de ${selectedIgreja.nome}`} 
                className="w-full h-full object-cover object-left rounded-xl" 
                src={selectedIgreja.logo_url} 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building size={24} />
              </div>
            )}
          </div>
          <div className="overflow-hidden">
            <h2 className="text-md font-bold text-slate-900 dark:text-white leading-tight truncate">
              {selectedIgreja ? selectedIgreja.nome : 'Congregación'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal truncate mt-0.5">
              Pentecostés
            </p>
          </div>
        </div>
        
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href + '/'));
            const Icon = item.icon;
            
            if (item.disabled) {
              return (
                <div 
                  key={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-slate-450 dark:text-slate-500 cursor-not-allowed"
                  title="Em breve"
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </div>
              );
            }

            return (
              <Link 
                key={item.href}
                href={item.href} 
                onClick={() => setIsOpen && setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold cursor-pointer transition-all ${
                  isActive 
                    ? 'bg-[#E4A232] text-white shadow-md active:scale-98' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-150 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white hover:translate-x-1 duration-200'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="px-4 space-y-1 mt-6">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-red-650 dark:hover:text-white hover:bg-red-50/50 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-all text-sm font-bold">
          <LogOut size={20} />
          <span>{t('logout')}</span>
        </button>
      </div>
    </aside>
  );
}
