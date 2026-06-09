'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

export type User = {
  id: string;
  email: string;
  id_perfil: string | null;
  id_deputado: string | null;
  is_admin: boolean;
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
      // eslint-disable-next-line
      setUser(JSON.parse(storedUser));
      setSessionId(storedSession);
    }
    setLoading(false);
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

      const newSessionId = crypto.randomUUID();
      
      // Update session ID in DB
      await supabase
        .from('usuarios')
        .update({ current_session_id: newSessionId, last_activity_at: new Date().toISOString() })
        .eq('id', data.id);

      const userData: User = {
        id: data.id,
        email: data.email,
        id_perfil: data.id_perfil,
        id_deputado: data.id_deputado,
        is_admin: data.is_admin,
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
    if (user.is_admin) return true;
    if (menu === '/' || menu === '/mapa' || menu === '/formularios') return true; // Always allowed
    if (!user.perfil) return false;
    return user.perfil.permissoes.includes(menu);
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
