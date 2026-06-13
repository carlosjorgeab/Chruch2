'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { defaultTranslations } from '@/lib/translations';

type LanguageType = 'pt' | 'es' | 'en';

type LanguageContextType = {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => Promise<void>;
  t: (key: string, defaultText?: string) => string;
  overrides: Record<string, string>;
  saveOverride: (key: string, value: string) => Promise<void>;
  loading: boolean;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageType>('pt');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLanguageSettings() {
      try {
        setLoading(true);
        // Load active language standard
        const storedLang = localStorage.getItem('app_language');
        if (storedLang === 'pt' || storedLang === 'es' || storedLang === 'en') {
          setLanguageState(storedLang as LanguageType);
        } else {
          // Fetch from Supabase as fallback
          const { data: dbLang } = await supabase
            .from('configuracoes_sistema')
            .select('valor')
            .eq('chave', 'language_default')
            .single();
          if (dbLang?.valor === 'pt' || dbLang?.valor === 'es' || dbLang?.valor === 'en') {
            setLanguageState(dbLang.valor as LanguageType);
            localStorage.setItem('app_language', dbLang.valor);
          }
        }

        // Load translation overrides
        const { data: dbOverrides } = await supabase
          .from('configuracoes_sistema')
          .select('valor')
          .eq('chave', 'translation_overrides')
          .single();

        if (dbOverrides?.valor) {
          try {
            const parsed = JSON.parse(dbOverrides.valor);
            setOverrides(parsed);
          } catch (e) {
            console.error('Failed to parse translation overrides:', e);
          }
        } else {
          const storedOverrides = localStorage.getItem('translation_overrides');
          if (storedOverrides) {
            setOverrides(JSON.parse(storedOverrides));
          }
        }
      } catch (err) {
        console.error('Failed to load language/overrides settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadLanguageSettings();
  }, []);

  const setLanguage = async (lang: LanguageType) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
    try {
      await supabase
        .from('configuracoes_sistema')
        .upsert({ chave: 'language_default', valor: lang }, { onConflict: 'chave' });
    } catch (e) {
      console.error('Failed to persist language in Supabase:', e);
    }
  };

  const saveOverride = async (key: string, value: string) => {
    const nextOverrides = {
      ...overrides,
      [`${language}_${key}`]: value
    };
    setOverrides(nextOverrides);
    localStorage.setItem('translation_overrides', JSON.stringify(nextOverrides));

    try {
      await supabase
        .from('configuracoes_sistema')
        .upsert({ chave: 'translation_overrides', valor: JSON.stringify(nextOverrides) }, { onConflict: 'chave' });
    } catch (e) {
      console.error('Failed to persist translation overrides in Supabase:', e);
    }
  };

  const t = (key: string, defaultText?: string): string => {
    const overrideKey = `${language}_${key}`;
    if (overrides[overrideKey]) {
      return overrides[overrideKey];
    }
    return defaultTranslations[language]?.[key] || defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, overrides, saveOverride, loading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
