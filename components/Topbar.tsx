'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Search, Bell, UserCircle, ChevronDown, Building2, Settings, Users, LogOut, CheckCircle2, AlertTriangle, Calendar, Award, Megaphone } from 'lucide-react';
import { useIgreja } from '@/context/IgrejaContext';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';

export function Topbar() {
  const { igrejas, selectedIgreja, setSelectedIgreja } = useIgreja();
  const { user, logout, hasPermission } = useAuth();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const getFirstNome = (user: any) => {
    if (user?.nome) {
      return user.nome.split(' ')[0];
    }
    if (!user?.email) return 'Usuário';
    const namePart = user.email.split('@')[0];
    const firstPart = namePart.split(/[\._-]/)[0];
    const cleanPart = firstPart.replace(/[0-9]+$/, '');
    return cleanPart ? cleanPart.charAt(0).toUpperCase() + cleanPart.slice(1).toLowerCase() : 'Usuário';
  };

  // Notifications states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [configs, setConfigs] = useState<Record<string, boolean>>({
    notify_new_members: true,
    notify_lessons: true,
    notify_low_balance: true,
    notify_birthdays: true,
  });

  useEffect(() => {
    async function fetchNotifications() {
      if (!user) return;

      try {
        // 1. Fetch system-wide notification configs
        const { data: configData } = await supabase.from('configuracoes_sistema').select('*');
        const activeConfigs: Record<string, any> = {
          notify_new_members: true,
          notify_lessons: true,
          notify_low_balance: true,
          notify_birthdays: true,
          tempo_lembrete: 15,
        };

        if (configData) {
          configData.forEach((c: any) => {
            if (c.chave === 'notify_new_members') activeConfigs.notify_new_members = (c.valor === 'true');
            if (c.chave === 'notify_lessons') activeConfigs.notify_lessons = (c.valor === 'true');
            if (c.chave === 'notify_low_balance') activeConfigs.notify_low_balance = (c.valor === 'true');
            if (c.chave === 'notify_birthdays') activeConfigs.notify_birthdays = (c.valor === 'true');
            if (c.chave === 'tempo_lembrete') activeConfigs.tempo_lembrete = parseInt(c.valor, 10) || 15;
            if (selectedIgreja?.id && c.chave === `tempo_lembrete_${selectedIgreja.id}`) {
              activeConfigs.tempo_lembrete = parseInt(c.valor, 10) || 15;
            }
          });
        }
        setConfigs(activeConfigs);

        const list: any[] = [];
        const isUserAdmin = user.is_admin;
        const userPerms = user.perfil?.permissoes || [];

        // 2. Fetch Members & Birthdays if permissions allow
        if (isUserAdmin || userPerms.includes('/membros')) {
          let mQuery = supabase.from('membros').select('*');
          if (selectedIgreja?.id) {
            mQuery = mQuery.eq('id_igreja', selectedIgreja.id);
          }
          const { data: members } = await mQuery;
          if (members) {
            const now = new Date();
            members.forEach((m: any) => {
              // New Members alert
              if (activeConfigs.notify_new_members) {
                const mDate = new Date(m.created_at);
                const diffTime = Math.abs(now.getTime() - mDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 14) {
                  list.push({
                    id: `new-member-${m.id}`,
                    title: 'Novo Membro Cadastrado',
                    message: `${m.nome} ingressou como ${m.cargo || 'Membro'}.`,
                    time: `${diffDays}d atrás`,
                    type: 'member',
                  });
                }
              }

              // Birthdays alert
              if (activeConfigs.notify_birthdays && m.data_nascimento) {
                const parts = m.data_nascimento.split('-');
                if (parts.length === 3) {
                  const bMonth = parseInt(parts[1], 10) - 1;
                  const bDay = parseInt(parts[2], 10);
                  const currentMonth = now.getMonth();
                  if (currentMonth === bMonth) {
                    list.push({
                      id: `birthday-${m.id}`,
                      title: 'Aniversariante do Mês',
                      message: `Dia ${bDay} - ${m.nome} faz aniversário este mês!`,
                      time: 'Festa',
                      type: 'birthday',
                    });
                  }
                }
              }
            });
          }
        }

        // 3. Fetch Lessons/Lecões
        if (activeConfigs.notify_lessons && (isUserAdmin || userPerms.includes('/licoes'))) {
          let lQuery = supabase.from('lecoes').select('*').eq('status', 'Programada');
          if (selectedIgreja?.id) {
            lQuery = lQuery.eq('id_igreja', selectedIgreja.id);
          }
          const { data: lessons } = await lQuery;
          if (lessons) {
            lessons.forEach((l: any) => {
              const formattedDate = l.data ? new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data';
              list.push({
                id: `lesson-${l.id}`,
                title: 'Lição Programada',
                message: `Lembrete da Escola Bíblica: "${l.titulo}" agendada para ${formattedDate}.`,
                time: l.data || 'Breve',
                type: 'lesson',
              });
            });
          }
        }

        // 4. Fetch Financial Transaction Balance Flow
        if (activeConfigs.notify_low_balance && (isUserAdmin || userPerms.includes('/financeiro'))) {
          let tQuery = supabase.from('transacoes').select('tipo, valor');
          if (selectedIgreja?.id) {
            tQuery = tQuery.eq('id_igreja', selectedIgreja.id);
          }
          const { data: transactions } = await tQuery;
          if (transactions) {
            let total = 0;
            transactions.forEach((t: any) => {
              if (t.tipo === 'Entrada') total += Number(t.valor);
              else if (t.tipo === 'Saída') total -= Number(t.valor);
            });

            if (total < 5000) {
              list.push({
                id: 'low-balance',
                title: 'Alerta de Saldo Mínimo',
                message: `Atenção: Saldo geral está abaixo de R$ 5.000,00 (Total: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`,
                time: 'Urgente',
                type: 'balance',
              });
            }
          }
        }

        // 5. Fetch Active Mural de Avisos
        if (selectedIgreja?.id) {
          try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { data: notices, error: errNotices } = await supabase
              .from('mural_avisos')
              .select('*')
              .eq('id_igreja', selectedIgreja.id)
              .eq('status', 'Publicado');

            if (!errNotices && notices) {
              notices.forEach((n: any) => {
                if (n.notificar_automatico === false) return;
                const start = n.data_inicio ? new Date(n.data_inicio + 'T00:00:00') : null;
                const end = n.data_fim ? new Date(n.data_fim + 'T00:00:00') : null;

                if (start && start > today) return;
                if (end && end < today) return;

                list.push({
                  id: `mural-${n.id}`,
                  title: 'Alerta de Mural Ativo',
                  message: `Novo comunicado publicado: "${n.titulo}"`,
                  time: n.data_inicio ? new Date(n.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : 'Mural',
                  type: 'mural',
                });
              });
            } else {
              // Fallback to localStorage
              const localData = typeof window !== 'undefined' ? localStorage.getItem(`mural_avisos_${selectedIgreja.id}`) : null;
              if (localData) {
                const parsed = JSON.parse(localData);
                parsed.forEach((n: any) => {
                  if (n.status !== 'Publicado') return;
                  if (n.notificar_automatico === false) return;
                  const start = n.data_inicio ? new Date(n.data_inicio + 'T00:00:00') : null;
                  const end = n.data_fim ? new Date(n.data_fim + 'T00:00:00') : null;

                  if (start && start > today) return;
                  if (end && end < today) return;

                  list.push({
                    id: `mural-${n.id}`,
                    title: 'Alerta de Mural Ativo',
                    message: `Novo comunicado publicado: "${n.titulo}"`,
                    time: n.data_inicio ? new Date(n.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : 'Mural',
                    type: 'mural',
                  });
                });
              }
            }
          } catch (muralErr) {
            console.warn('Mural notices fetch error:', muralErr);
          }
        }

        // 6. Fetch Upcoming Agendas with Status 'Alerta'
        if (selectedIgreja?.id) {
          try {
            const { data: agendaAlerts, error: errAgenda } = await supabase
              .from('agendas')
              .select('*')
              .eq('id_igreja', selectedIgreja.id)
              .eq('status', 'Alerta');

            if (!errAgenda && agendaAlerts) {
              const now = new Date();
              agendaAlerts.forEach((a: any) => {
                const eventDate = new Date(a.data_hora);
                // Highlight upcoming alert events, or current alerts
                list.push({
                  id: `agenda-alerta-${a.id}`,
                  title: 'Alerta da Agenda',
                  message: `Evento "${a.titulo}" tem status 'Alerta' agendado para ${eventDate.toLocaleDateString('pt-BR')} às ${eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
                  time: 'Alerta',
                  type: 'agenda_alerta',
                });
              });
            }
          } catch (agendaErr) {
            console.warn('Agenda alerts fetch error:', agendaErr);
          }
        }

        // 7. Fetch Upcoming Agendas to trigger Reminders based on custom 'Tempo de Lembrete'
        if (selectedIgreja?.id) {
          try {
            const { data: upcomingEvents, error: errUpcoming } = await supabase
              .from('agendas')
              .select('*')
              .eq('id_igreja', selectedIgreja.id);

            if (!errUpcoming && upcomingEvents) {
              const now = new Date();
              const limitMinutes = activeConfigs.tempo_lembrete;
              
              upcomingEvents.forEach((a: any) => {
                const eventDate = new Date(a.data_hora);
                const diffMs = eventDate.getTime() - now.getTime();
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                
                // If the event starts in the future and is within the limitMinutes threshold
                // (e.g. starts in 0 to limitMinutes from now)
                if (diffMinutes >= 0 && diffMinutes <= limitMinutes) {
                  list.push({
                    id: `agenda-lembrete-${a.id}`,
                    title: 'Lembrete de Evento',
                    message: `O evento "${a.titulo}" começará em ${diffMinutes} minutos (${eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}).`,
                    time: `${diffMinutes} min`,
                    type: 'agenda_reminder',
                  });
                }
              });
            }
          } catch (upcomingErr) {
            console.warn('Upcoming agenda events fetch error:', upcomingErr);
          }
        }

        setNotifications(list);
      } catch (err) {
        console.error('Error compiling alerts:', err);
      }
    }

    fetchNotifications();
    
    // Refresh notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [user, selectedIgreja]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/busca?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="fixed top-0 w-full z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl flex justify-between items-center px-4 md:px-6 h-16 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 md:gap-3 ml-10 md:ml-64">
        <Logo className="w-10 h-10 md:w-12 md:h-12 shrink-0 animate-in fade-in duration-300" />
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

        {/* Notifications Icon & Panel */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 relative text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors focus:outline-none"
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-650 dark:bg-red-500 text-[9px] font-black text-white flex items-center justify-center rounded-full border border-white dark:border-slate-900 shadow-sm animate-pulse">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 py-3 z-50 animate-in fade-in slide-in-from-top-3 duration-250">
              <div className="flex items-center justify-between px-4 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Notificações Ativas ({notifications.length})
                </span>
                {notifications.length > 0 && (
                  <button 
                    onClick={() => setNotifications([])}
                    className="text-[10px] text-amber-500 hover:text-amber-600 font-bold uppercase tracking-wider transition-colors"
                  >
                    Estrear Limpar
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="py-8 px-4 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
                    <CheckCircle2 className="mx-auto text-slate-300 dark:text-slate-705 mb-2.5" size={28} />
                    Nenhuma notificação ativa no momento.
                  </div>
                ) : (
                  notifications.map((n) => {
                    let Icon = Bell;
                    let color = 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
                    if (n.type === 'member') { Icon = Users; color = 'text-green-500 bg-green-50 dark:bg-green-900/20'; }
                    if (n.type === 'birthday') { Icon = Calendar; color = 'text-pink-500 bg-pink-50 dark:bg-pink-900/20'; }
                    if (n.type === 'lesson') { Icon = Award; color = 'text-purple-500 bg-purple-50 dark:bg-purple-900/20'; }
                    if (n.type === 'balance') { Icon = AlertTriangle; color = 'text-amber-500 bg-amber-50 dark:bg-amber-900/20'; }
                    if (n.type === 'mural') { Icon = Megaphone; color = 'text-amber-600 bg-amber-55 dark:bg-amber-950/20'; }
                    if (n.type === 'agenda_alerta') { Icon = AlertTriangle; color = 'text-red-500 bg-red-50 dark:bg-red-955/20 animate-pulse'; }

                    return (
                      <div key={n.id} className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors flex gap-3">
                        <div className={`p-2 rounded-xl h-9 w-9 flex items-center justify-center shrink-0 ${color}`}>
                          <Icon size={16} />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-slate-850 dark:text-white leading-normal">{n.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{n.message}</p>
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              {n.time}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative group">
          <div className="flex items-center gap-3 pl-3 md:pl-5 border-l border-slate-200 dark:border-slate-800 cursor-pointer">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight truncate max-w-[120px]">{getFirstNome(user)}</p>
              <p className="text-xs text-slate-500 group-hover:text-amber-500 transition-colors">{user?.perfil?.nome || 'Membro'}</p>
            </div>
            <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-200 dark:border-slate-700 shrink-0">
              {user?.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.foto_url} alt="profile" className="w-full h-full object-cover" onError={(e) => { (e.target as any).style.display = 'none' }} />
              ) : (
                <UserCircle size={24} />
              )}
            </div>
          </div>
          
          {/* Profile Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-700 mb-2">
              <p className="text-xs text-slate-400 uppercase font-black tracking-widest mb-1">Conta</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.email}</p>
            </div>
            
            {(user?.id_master || user?.is_admin) && (
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
                {user?.id_master && (
                  <Link 
                    href="/configuracoes" 
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-amber-500 transition-colors"
                  >
                    <Settings size={16} />
                    <span>{t('menu_configuracoes') || 'Configurações'}</span>
                  </Link>
                )}
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
