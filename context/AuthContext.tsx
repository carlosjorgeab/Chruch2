'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

export type User = {
  id: string;
  nome?: string;
  email: string;
  id_perfil: string | null;
  id_igreja: string | null;
  is_admin: boolean;
  id_master: boolean;
  foto_url?: string;
  perfil?: {
    nome: string;
    permissoes: string[];
  };
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<{ error: string | null }>;
  logout: () => void;
  hasPermission: (menu: string) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Prevent ResizeObserver loop limit errors from propagating globally,
    // which can trigger serialization crashes (circular structure JSON stringify) in the preview iframe.
    const handleResizeError = (e: ErrorEvent) => {
      if (
        e.message && (
          e.message.toLowerCase().includes('resizeobserver') ||
          e.message.toLowerCase().includes('loop completed with undelivered notifications') ||
          e.message.toLowerCase().includes('loop limit exceeded')
        )
      ) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };

    const handleRejection = (e: PromiseRejectionEvent) => {
      if (
        e.reason && e.reason.message && (
          e.reason.message.toLowerCase().includes('resizeobserver') ||
          e.reason.message.toLowerCase().includes('loop completed with undelivered notifications') ||
          e.reason.message.toLowerCase().includes('loop limit exceeded')
        )
      ) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };

    window.addEventListener('error', handleResizeError);
    window.addEventListener('unhandledrejection', handleRejection);

    const initConfigs = async () => {
      try {
        const { data: configs } = await supabase.from('configuracoes_sistema').select('*');
        if (configs) {
          configs.forEach((c: any) => {
            if (c.chave === 'session_timeout') {
              localStorage.setItem('session_timeout', c.valor);
            }
            if (c.chave === 'disable_multi_login') {
              localStorage.setItem('disable_multi_login', c.valor);
            }
          });
        }
      } catch (e) {
        console.error('Initial configs fetch error:', e);
      }
    };
    initConfigs();

    // Check local storage for session
    const storedUser = localStorage.getItem('democracia_user');
    const storedSession = localStorage.getItem('democracia_session_id');
    const storedTheme = localStorage.getItem('theme');

    if (storedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (storedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    }

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setSessionId(storedSession);

      // Re-fetch user details in background to ensure up-to-date permissions/profile
      (async () => {
        try {
          const { data } = await supabase
            .from('usuarios')
            .select('*, perfil:perfis(nome, permissoes)')
            .eq('id', parsedUser.id)
            .single();

          if (data) {
            const userData: User = {
              id: data.id,
              nome: data.nome,
              email: data.email,
              id_perfil: data.id_perfil,
              id_igreja: data.id_igreja,
              is_admin: data.is_admin,
              id_master: data.id_master || false,
              foto_url: data.foto_url,
              perfil: data.perfil
            };
            setUser(userData);
            localStorage.setItem('democracia_user', JSON.stringify(userData));
          }
        } catch (err) {
          console.error('Error re-fetching user profile in background:', err);
        }
      })();
    }
    setLoading(false);

    return () => {
      window.removeEventListener('error', handleResizeError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // Periodic check for multi-login and session status
  useEffect(() => {
    if (!user || !sessionId) return;

    const checkSession = async () => {
      try {
        // 1. Fetch system configs to see if multi-login is disabled
        const { data: config } = await supabase
          .from('configuracoes_sistema')
          .select('valor')
          .eq('chave', 'disable_multi_login')
          .single();

        const multiLoginDisabled = config?.valor === 'true';

        if (multiLoginDisabled) {
          // 2. Check if current user has a different session ID in the DB
          const { data: userData } = await supabase
            .from('usuarios')
            .select('current_session_id')
            .eq('id', user.id)
            .single();

          if (userData?.current_session_id && userData.current_session_id !== sessionId) {
            console.warn('Simultaneous login detected. Logging out...');
            alert('Sua conta foi acessada em outro dispositivo. Você foi deslogado.');
            logout();
          }
        }
      } catch (e) {
        console.error('Session check error:', e);
      }
    };

    const interval = setInterval(checkSession, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [user, sessionId]);

  // Inactivity timeout monitor
  useEffect(() => {
    if (!user) return;

    let lastActivity = Date.now();

    const updateActivity = () => {
      lastActivity = Date.now();
    };

    // List of events that indicate user activity
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity, { passive: true });
    window.addEventListener('touchstart', updateActivity, { passive: true });

    // Check every 10 seconds if elapsed time exceeds user's timeout config
    const timeoutChecker = setInterval(() => {
      const storedTimeout = localStorage.getItem('session_timeout');
      const timeoutMinutes = parseInt(storedTimeout || '30', 10);
      const timeoutMs = timeoutMinutes * 60 * 1000;

      if (Date.now() - lastActivity >= timeoutMs) {
        clearInterval(timeoutChecker);
        alert(`Sua sessão foi encerrada automaticamente por inatividade (${timeoutMinutes} minutos).`);
        logout();
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      clearInterval(timeoutChecker);
    };
  }, [user]);

  useEffect(() => {
    if (!loading) {
      const isPublicRoute = pathname?.startsWith('/p/');
      if (!user && pathname !== '/login' && !isPublicRoute) {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, senha: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*, perfil:perfis(nome, permissoes)')
        .eq('email', email)
        .eq('senha', senha)
        .single();

      if (error || !data) {
        setLoading(false);
        return { error: 'Credenciais inválidas' };
      }

      if (data.id_igreja && !data.is_admin) {
        const { data: igrejaData } = await supabase
          .from('igrejas')
          .select('id, nome, endereco, assinatura_vigencia')
          .eq('id', data.id_igreja)
          .single();

        if (igrejaData) {
          let vigDate = igrejaData.assinatura_vigencia || '';
          if (!vigDate && igrejaData.endereco && igrejaData.endereco.includes('| VIGENCIA:')) {
            const parts = igrejaData.endereco.split('| VIGENCIA:');
            vigDate = parts[1].trim();
          }

          if (vigDate) {
            const expirationDate = new Date(vigDate + 'T23:59:59');
            if (expirationDate < new Date()) {
              // Suspend all users of this church
              await supabase
                .from('usuarios')
                .update({ ativo: false })
                .eq('id_igreja', data.id_igreja);

              setLoading(false);
              return { error: 'O período de vigência de assinatura desta igreja venceu. Todos os usuários da igreja foram suspensos.' };
            }
          }
        }
      }

      if (data.ativo === false) {
        setLoading(false);
        return { error: 'Esta conta está desabilitada.' };
      }

      const newSessionId = crypto.randomUUID();
      
      // Update session ID in DB
      await supabase
        .from('usuarios')
        .update({ current_session_id: newSessionId, last_activity_at: new Date().toISOString() })
        .eq('id', data.id);

      const userData: User = {
        id: data.id,
        nome: data.nome,
        email: data.email,
        id_perfil: data.id_perfil,
        id_igreja: data.id_igreja,
        is_admin: data.is_admin,
        id_master: data.id_master || false,
        foto_url: data.foto_url,
        perfil: data.perfil
      };

      // Apply theme preference from user profile
      if (data.theme_preference) {
        localStorage.setItem('theme', data.theme_preference);
        if (data.theme_preference === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }

      setUser(userData);
      setSessionId(newSessionId);
      localStorage.setItem('democracia_user', JSON.stringify(userData));
      localStorage.setItem('democracia_session_id', newSessionId);
      setLoading(false);
      router.push('/');
      return { error: null };
    } catch (err) {
      setLoading(false);
      return { error: 'Erro ao fazer login' };
    }
  };

  const logout = () => {
    setUser(null);
    setSessionId(null);
    localStorage.removeItem('democracia_user');
    localStorage.removeItem('democracia_session_id');
    router.push('/login');
  };

  const hasPermission = (menu: string) => {
    const isPublicRoute = pathname?.startsWith('/p/');
    if (isPublicRoute) {
      return menu === '/' || menu === '/mapa' || menu === '/formularios';
    }
    if (!user) return false;
    
    // 1) id_master always has full access to all modules and system
    if (user.id_master) {
      return true;
    }
    
    // 2) is_admin (but not id_master) has full access EXCEPT for /igrejas
    if (user.is_admin) {
      if (menu === '/igrejas') {
        return false;
      }
      return true;
    }
    
    // 3) Regular users cannot access churches, system configurations, profiles, or users modules
    if (menu === '/igrejas' || menu === '/configuracoes' || menu === '/perfis' || menu === '/usuarios') {
      return false;
    }
    
    if (menu === '/' || menu === '/mapa' || menu === '/formularios') return true; // Always allowed
    if (!user.perfil) return false;
    const perms = Array.isArray(user.perfil.permissoes) ? user.perfil.permissoes : [];
    return perms.includes(menu);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
