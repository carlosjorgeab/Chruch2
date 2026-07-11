'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export type Igreja = {
  id: string;
  nome: string;
  slug?: string;
  logo_url?: string;
  ativo?: boolean;
  cor_fundo?: string | null;
  cor_paineis?: string | null;
  cor_bordas?: string | null;
  cor_fontes?: string | null;
  cor_botoes?: string | null;
  idioma_padrao?: string | null;
  config_etiqueta?: any;
};

type IgrejaContextType = {
  igrejas: Igreja[];
  selectedIgreja: Igreja | null;
  setSelectedIgreja: (igreja: Igreja | null) => void;
  loading: boolean;
};

const IgrejaContext = createContext<IgrejaContextType | undefined>(undefined);

export function IgrejaProvider({ children }: { children: ReactNode }) {
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [selectedIgreja, setSelectedIgreja] = useState<Igreja | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const pathname = usePathname();
  const { setLanguage } = useLanguage();

  useEffect(() => {
    if (selectedIgreja && selectedIgreja.idioma_padrao) {
      setLanguage(selectedIgreja.idioma_padrao as any);
    }
  }, [selectedIgreja, setLanguage]);

  useEffect(() => {
    async function fetchIgrejas() {
      // Check if it's a public route: /p/[id]
      const isPublicRoute = pathname?.startsWith('/p/');
      let publicId = null;
      
      if (!isPublicRoute && !user) {
        setIgrejas([]);
        setSelectedIgreja(null);
        setLoading(false);
        return;
      }

      let query = supabase.from('igrejas').select('*');
      
      if (user?.id_master) {
        // id_master has access to all churches
      } else if (user?.id_igreja) {
        // is_admin and regular users are restricted to their specific church
        query = query.eq('id', user.id_igreja).eq('ativo', true);
      } else {
        query = query.eq('ativo', true);
      }

      const { data, error } = await query;
      
      if (!error && data) {
        setIgrejas(data);
        if (data.length > 0) {
          setSelectedIgreja((prev) => {
             if (prev && data.some((d: any) => d.id === prev.id)) {
               return prev;
             }
             return data[0];
          });
        } else {
           setSelectedIgreja(null);
        }
      } else {
        setSelectedIgreja(null);
      }
      setLoading(false);
    }
    fetchIgrejas();
  }, [user, pathname]);

  return (
    <IgrejaContext.Provider value={{ igrejas, selectedIgreja, setSelectedIgreja, loading }}>
      {children}
    </IgrejaContext.Provider>
  );
}

export function useIgreja() {
  const context = useContext(IgrejaContext);
  if (context === undefined) {
    throw new Error('useIgreja must be used within an IgrejaProvider');
  }
  return context;
}

