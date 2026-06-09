'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

type Deputado = {
  id: string;
  nome: string;
  slug?: string;
  id_partido: string;
  estado: string;
  foto_url: string;
  ativo?: boolean;
  partidos?: {
    sigla: string;
    nome: string;
    cor_primaria?: string;
    cor_secundaria?: string;
    cor_terciaria?: string;
  };
};

type DeputadoContextType = {
  deputados: Deputado[];
  selectedDeputado: Deputado | null;
  setSelectedDeputado: (deputado: Deputado | null) => void;
  loading: boolean;
};

const DeputadoContext = createContext<DeputadoContextType | undefined>(undefined);

export function DeputadoProvider({ children }: { children: ReactNode }) {
  const [deputados, setDeputados] = useState<Deputado[]>([]);
  const [selectedDeputado, setSelectedDeputado] = useState<Deputado | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    async function fetchDeputados() {
      // Check if it's a public route: /p/[id]
      const isPublicRoute = pathname?.startsWith('/p/');
      let publicId = null;
      
      if (isPublicRoute) {
        const parts = pathname?.split('/');
        if (parts && parts.length >= 3) {
          publicId = parts[2]; // /p/[id]/...
        }
      }

      if (!isPublicRoute && !user) {
        setDeputados([]);
        setSelectedDeputado(null);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('deputado')
        .select('*, partidos(sigla, nome, cor_primaria, cor_secundaria, cor_terciaria)');
      
      if (isPublicRoute && publicId) {
        // Public pages MUST only show active deputies
        query = query.eq('ativo', true);
        
        // Try to match by slug first, or fallback to id if it's a valid UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(publicId);
        if (isUuid) {
          query = query.eq('id', publicId);
        } else {
          query = query.eq('slug', publicId);
        }
      } else if (!user?.is_admin && user?.id_deputado) {
        // Regular users only see their assigned deputy, but it MUST be active
        query = query.eq('id', user.id_deputado).eq('ativo', true);
      } else if (!user?.is_admin) {
        // If regular user has no id_deputado, they see nothing or only active ones depending on your logic
        // but user says "desabilite o acesso a todos os usuários que possuem o deputado que não estão ativos"
        query = query.eq('ativo', true);
      }

      const { data, error } = await query;
      
      if (!error && data) {
        setDeputados(data);
        if (data.length > 0) {
          setSelectedDeputado((prev) => {
             // If we already have a selected deputado and it exists in the fetched data, keep it!
             if (prev && data.some(d => d.id === prev.id)) {
               return prev;
             }
             // Otherwise, fallback to the default or the first one
             return data[0];
          });
        } else {
           setSelectedDeputado(null);
        }
      } else {
        setSelectedDeputado(null);
      }
      setLoading(false);
    }
    fetchDeputados();
  }, [user, pathname]);

  // Apply theme colors when selectedDeputado changes
  useEffect(() => {
    if (selectedDeputado?.partidos) {
      const root = document.documentElement;
      const { cor_primaria, cor_secundaria, cor_terciaria } = selectedDeputado.partidos;
      
      if (cor_primaria) {
        root.style.setProperty('--color-primary', cor_primaria);
        root.style.setProperty('--color-primary-container', cor_primaria);
        root.style.setProperty('--color-surface-tint', cor_primaria);
        root.style.setProperty('--color-outline', cor_primaria);
        root.style.setProperty('--color-error', cor_primaria);
      }
      
      if (cor_secundaria) {
        root.style.setProperty('--color-secondary', cor_secundaria);
      }
      
      if (cor_terciaria) {
        root.style.setProperty('--color-tertiary', cor_terciaria);
      }
    }
  }, [selectedDeputado]);

  return (
    <DeputadoContext.Provider value={{ deputados, selectedDeputado, setSelectedDeputado, loading }}>
      {children}
    </DeputadoContext.Provider>
  );
}

export function useDeputado() {
  const context = useContext(DeputadoContext);
  if (context === undefined) {
    throw new Error('useDeputado must be used within a DeputadoProvider');
  }
  return context;
}
