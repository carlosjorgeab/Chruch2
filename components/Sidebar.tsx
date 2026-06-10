'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, UsersRound, BookOpen, ClipboardCheck, Wallet, Settings, LogOut, Shield, Building } from 'lucide-react';
import { useIgreja } from '@/context/IgrejaContext';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';

export function Sidebar({ isOpen = false, setIsOpen }: { isOpen?: boolean, setIsOpen?: (v: boolean) => void }) {
  const pathname = usePathname();
  const { selectedIgreja } = useIgreja();
  const { logout, hasPermission, user } = useAuth();

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Painel Principal', disabled: false, id: '/' },
    { href: '/membros', icon: Users, label: 'Membros', disabled: false, id: '/membros' },
    { href: '/comunidades', icon: UsersRound, label: 'Comunidades', disabled: false, id: '/comunidades' },
    { href: '/licoes', icon: BookOpen, label: 'Lições', disabled: false, id: '/licoes' },
    { href: '/presencas', icon: ClipboardCheck, label: 'Asistência', disabled: false, id: '/presencas' },
    { href: '/financeiro', icon: Wallet, label: 'Financeiro', disabled: false, id: '/financeiro' },
    { href: '/igrejas', icon: Building, label: 'Igrejas', disabled: false, id: '/igrejas' },
    { href: '/perfis', icon: Shield, label: 'Perfis', disabled: false, id: '/perfis' },
    { href: '/usuarios', icon: Users, label: 'Usuários', disabled: false, id: '/usuarios' },
    { href: '/configuracoes', icon: Settings, label: 'Configurações', disabled: false, id: '/configuracoes' },
  ].filter(item => {
    if (item.id === '/perfis' || item.id === '/usuarios' || item.id === '/configuracoes' || item.id === '/igrejas') {
      return user?.is_admin || hasPermission(item.id);
    }
    return hasPermission(item.id);
  });

  const handleLogout = async () => {
    logout();
  };

  return (
    <aside className={`h-screen w-64 fixed left-0 top-0 pt-16 z-50 bg-[#251A36] dark:bg-[#1A1226] text-white flex flex-col justify-between py-6 border-r border-slate-800 font-['Inter'] text-sm font-medium transition-transform duration-300 overflow-y-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="px-4 space-y-2">
        <div className="mb-8 px-2 flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-[#E4A232] flex items-center justify-center text-white flex-shrink-0 shadow-md">
            {selectedIgreja?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                alt={`Logo de ${selectedIgreja.nome}`} 
                className="w-8 h-8 object-cover" 
                src={selectedIgreja.logo_url} 
              />
            ) : (
                <Building size={20} />
            )}
          </div>
          <div className="overflow-hidden">
            <h2 className="text-md font-bold text-white leading-tight truncate">
              {selectedIgreja ? selectedIgreja.nome : 'Congregación'}
            </h2>
            <p className="text-xs text-slate-300 font-normal truncate mt-0.5">
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
                  className="flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-slate-500 cursor-not-allowed"
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
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold cursor-pointer transition-all ${
                  isActive 
                    ? 'bg-[#E4A232] text-white shadow-md active:scale-98' 
                    : 'text-slate-300 hover:bg-white/10 hover:translate-x-1 duration-200'
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
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer transition-all text-sm font-medium">
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
