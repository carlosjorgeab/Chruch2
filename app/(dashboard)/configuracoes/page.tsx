'use client';
import { useState, useEffect } from 'react';
import { Settings, Save, Bell, Shield, Globe, Moon, Clock, Lock, MonitorStop, RefreshCw, CheckCircle, AlertTriangle, Database, FileText, Copy, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { defaultTranslations } from '@/lib/translations';

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('geral');
  const [darkMode, setDarkMode] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [disableMultiLogin, setDisableMultiLogin] = useState(false);
  const { language: sysLanguage, setLanguage: setLanguageState, saveOverride, overrides } = useLanguage();
  const [editingTranslations, setEditingTranslations] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState('pt');
  
  // Notification states
  const [notifyNewMembers, setNotifyNewMembers] = useState(true);
  const [notifyLessons, setNotifyLessons] = useState(true);
  const [notifyLowBalance, setNotifyLowBalance] = useState(false);
  const [notifyBirthdays, setNotifyBirthdays] = useState(true);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Database status states
  const [dbStatus, setDbStatus] = useState<Record<string, { exists: boolean; loading: boolean; error?: string }>>({});
  const [checkingDb, setCheckingDb] = useState(false);
  const [schemaSql, setSchemaSql] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (activeTab === 'database') {
      checkDatabaseTables();
      fetchSchema();
    }
  }, [activeTab]);

  const fetchSchema = async () => {
    try {
      const res = await fetch('/api/schema');
      const data = await res.json();
      if (data.schema) {
        setSchemaSql(data.schema);
      }
    } catch (e) {
      console.error('Error fetching schema:', e);
    }
  };

  const checkDatabaseTables = async () => {
    setCheckingDb(true);
    const tables = ['igrejas', 'perfis', 'usuarios', 'membros', 'comunidades', 'lecoes', 'presencas', 'configuracoes_sistema', 'transacoes'];
    
    const statusUpdates: Record<string, { exists: boolean; loading: boolean; error?: string }> = {};
    
    for (const table of tables) {
      statusUpdates[table] = { exists: false, loading: true };
      setDbStatus(prev => ({ ...prev, [table]: { exists: false, loading: true } }));
      
      try {
        const { error } = await supabase.from(table).select('id').limit(1);
        
        if (error && (
          error.code === 'PGRST205' || 
          error.message?.includes('schema cache') || 
          error.message?.includes('not found') || 
          error.message?.includes('Relation') || 
          (error as any).status === 404
        )) {
          statusUpdates[table] = { exists: false, loading: false, error: error.message };
        } else {
          statusUpdates[table] = { exists: true, loading: false };
        }
      } catch (err: any) {
        statusUpdates[table] = { exists: false, loading: false, error: err.message || String(err) };
      }
    }

    setDbStatus(statusUpdates);
    setCheckingDb(false);
  };

  useEffect(() => {
    setMounted(true);
    fetchConfigs();

    // Initial theme check
    const savedDark = localStorage.getItem('theme') === 'dark';
    setDarkMode(savedDark);
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('*');

      if (error) throw error;

      if (data) {
        data.forEach((config: any) => {
          if (config.chave === 'session_timeout') setSessionTimeout(config.valor);
          if (config.chave === 'disable_multi_login') setDisableMultiLogin(config.valor === 'true');
          if (config.chave === 'language_default') setLanguage(config.valor);
          if (config.chave === 'notify_new_members') setNotifyNewMembers(config.valor === 'true');
          if (config.chave === 'notify_lessons') setNotifyLessons(config.valor === 'true');
          if (config.chave === 'notify_low_balance') setNotifyLowBalance(config.valor === 'true');
          if (config.chave === 'notify_birthdays') setNotifyBirthdays(config.valor === 'true');
        });
      }
    } catch (error) {
      console.error('Error fetching configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    if (newVal) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setStatusMessage(null);
      const themeVal = darkMode ? 'dark' : 'light';
      
      // Save to localStorage for immediate client-side effect
      localStorage.setItem('theme', themeVal);
      localStorage.setItem('session_timeout', sessionTimeout);
      localStorage.setItem('disable_multi_login', String(disableMultiLogin));

      // 1. Update system-wide configurations
      const updates = [
        { chave: 'session_timeout', valor: sessionTimeout },
        { chave: 'disable_multi_login', valor: String(disableMultiLogin) },
        { chave: 'theme_default', valor: themeVal },
        { chave: 'language_default', valor: language },
        { chave: 'notify_new_members', valor: String(notifyNewMembers) },
        { chave: 'notify_lessons', valor: String(notifyLessons) },
        { chave: 'notify_low_balance', valor: String(notifyLowBalance) },
        { chave: 'notify_birthdays', valor: String(notifyBirthdays) }
      ];

      for (const update of updates) {
        await supabase
          .from('configuracoes_sistema')
          .upsert(update, { onConflict: 'chave' });
      }

      // 2. Update current user preference if logged in
      const userStr = localStorage.getItem('democracia_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        await supabase
          .from('usuarios')
          .update({ theme_preference: themeVal })
          .eq('id', user.id);
      }

      setStatusMessage({ type: 'success', text: 'Configurações do sistema salvas com sucesso!' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('Error saving configs:', error);
      setStatusMessage({ type: 'error', text: 'Erro ao salvar as configurações: ' + (error.message || error) });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'geral', label: 'Geral', icon: Settings },
    { id: 'traducoes', label: 'Idiomas & Traduções', icon: Globe },
    { id: 'seguranca', label: 'Segurança', icon: Shield },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    { id: 'database', label: 'Banco de Dados', icon: Database },
  ];

  if (!mounted) return null;

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <p className="text-sm font-bold text-primary uppercase tracking-widest mb-1">Sistema</p>
        <h2 className="text-3xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">Configurações</h2>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 font-bold text-sm border animate-in fade-in duration-300 ${
          statusMessage.type === 'success' 
            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' 
            : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar de Configurações */}
        <div className="w-full md:w-64 space-y-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setStatusMessage(null);
                }}
                className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
          {activeTab === 'geral' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                <h3 className="text-xl font-black font-headline text-slate-900 dark:text-white uppercase">Preferências Gerais</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Ajuste as preferências visuais do sistema</p>
              </div>

              <div className="space-y-6">
                <div 
                  onClick={toggleDarkMode}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-primary transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700 group-hover:text-primary transition-colors">
                       <Moon size={20} />
                    </div>
                    <div>
                       <p className="font-bold text-slate-900 dark:text-white">Modo Escuro</p>
                       <p className="text-xs text-slate-500 dark:text-slate-400">Ativar tema escuro para reduzir cansaço visual</p>
                    </div>
                  </div>
                  <div className={`relative inline-block w-12 h-6 transition-colors duration-200 ease-in-out ${darkMode ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'} rounded-full`}>
                    <div className={`absolute top-1 w-4 h-4 transition-all duration-200 ease-in-out bg-white rounded-full ${darkMode ? 'left-7' : 'left-1'}`}></div>
                  </div>
                </div>

              </div>

              <div className="pt-8 flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="flex items-center gap-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'traducoes' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                <h3 className="text-xl font-black font-headline text-slate-900 dark:text-white uppercase">Idiomas & Traduções</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Personalize os termos e nomes de cada tela ou campo para os 3 idiomas</p>
              </div>

              {/* Language Selector in Translation tab */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Idioma para Customizar</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Escolha para qual idioma deseja ajustar as traduções ou termos de tela</p>
                </div>
                <div className="flex gap-2">
                  {(['pt', 'es', 'en'] as const).map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setLanguage(lang);
                        setLanguageState(lang);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs uppercase ${
                        language === lang
                          ? 'bg-amber-600 text-white shadow-md'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-705 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      {lang === 'pt' ? 'Português' : lang === 'es' ? 'Español' : 'English'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Translation entries */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Campos Disponíveis</h4>
                  <p className="text-[9px] text-slate-400">As alterações salvam e aplicam instantaneamente</p>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
                  {Object.keys(defaultTranslations[language as 'pt' | 'es' | 'en'] || {}).map((key) => {
                    const defaultText = (defaultTranslations[language as 'pt' | 'es' | 'en'] as any)[key];
                    const currentOverride = overrides[`${language}_${key}`] || '';
                    
                    return (
                      <div key={key} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-100/30 dark:hover:bg-slate-900/40 transition-all bg-transparent">
                        <div className="w-full md:w-1/3">
                          <p className="font-mono text-xs text-amber-600 dark:text-amber-500 font-bold">{key}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Padrão: <span className="italic">"{defaultText}"</span></p>
                        </div>
                        <div className="w-full md:w-2/3 flex gap-2">
                          <input
                            type="text"
                            value={editingTranslations[key] !== undefined ? editingTranslations[key] : (currentOverride || defaultText)}
                            onChange={(e) => {
                              setEditingTranslations(prev => ({
                                ...prev,
                                [key]: e.target.value
                              }));
                            }}
                            className="w-full px-4 py-2 border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl text-sm focus:border-amber-500 outline-none font-semibold transition-all"
                            placeholder={defaultText}
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const val = editingTranslations[key] !== undefined ? editingTranslations[key] : (currentOverride || defaultText);
                              await saveOverride(key, val);
                              setStatusMessage({ type: 'success', text: `Termo "${key}" personalizado com sucesso!` });
                              setTimeout(() => setStatusMessage(null), 3000);
                            }}
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1"
                          >
                            <Save size={12} />
                            Salvar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seguranca' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                <h3 className="text-xl font-black font-headline text-slate-900 dark:text-white uppercase">Segurança e Acesso</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Controle de sessão e proteção de dados</p>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <RefreshCw size={32} className="animate-spin mb-4" />
                  <p className="font-bold uppercase tracking-widest text-xs">Carregando configurações...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Tempo de Inatividade */}
                  <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                      <Clock size={20} className="text-primary" />
                      <p className="font-bold">Tempo de Inatividade</p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Encerrar sessão automaticamente após minutos sem atividade.</p>
                    <div className="flex items-center gap-4">
                      <input 
                        type="number" 
                        min="1" max="1440"
                        className="w-24 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 font-bold focus:border-primary outline-none text-slate-900 dark:text-white"
                        value={sessionTimeout}
                        onChange={(e) => setSessionTimeout(e.target.value)}
                        disabled={saving}
                      />
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Minutos</span>
                    </div>
                  </div>

                  {/* Login Simultâneo */}
                  <div 
                    onClick={() => !saving && setDisableMultiLogin(!disableMultiLogin)}
                    className={`flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 transition-all group ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700 group-hover:text-primary transition-colors">
                         <MonitorStop size={20} />
                      </div>
                      <div>
                         <p className="font-bold text-slate-900 dark:text-white">Impedir Login Simultâneo</p>
                         <p className="text-xs text-slate-500 dark:text-slate-400">Deslogar outros dispositivos se houver um novo acesso</p>
                      </div>
                    </div>
                    <div className={`relative inline-block w-12 h-6 transition-colors duration-200 ease-in-out ${disableMultiLogin ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'} rounded-full`}>
                      <div className={`absolute top-1 w-4 h-4 transition-all duration-200 ease-in-out bg-white rounded-full ${disableMultiLogin ? 'left-7' : 'left-1'}`}></div>
                    </div>
                  </div>

                  {/* Autenticação em Duas Etapas (Placeholder funcional) */}
                  <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700">
                         <Lock size={20} />
                      </div>
                      <div>
                         <p className="font-bold text-slate-900 dark:text-white">Autenticação em Dois Fatores</p>
                         <p className="text-xs text-slate-500 dark:text-slate-400">Camada extra de segurança (Em breve)</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">Desabilitado</span>
                  </div>
                </div>
              )}

              <div className="pt-8 flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="flex items-center gap-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notificacoes' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                <h3 className="text-xl font-black font-headline text-slate-900 dark:text-white uppercase">Preferências de Notificações</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Controle quais avisos e alertas você deseja receber ou gerar no sistema</p>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <RefreshCw size={32} className="animate-spin mb-4" />
                  <p className="font-bold uppercase tracking-widest text-xs">Carregando...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Novos Membros */}
                  <div 
                    onClick={() => !saving && setNotifyNewMembers(!notifyNewMembers)}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-primary transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700 group-hover:text-primary transition-colors">
                         <Bell size={20} />
                      </div>
                      <div>
                         <p className="font-bold text-slate-900 dark:text-white">Novos Membros Cadastrados</p>
                         <p className="text-xs text-slate-500 dark:text-slate-400">Notificar quando um novo membro se registrar ou for adicionado</p>
                      </div>
                    </div>
                    <div className={`relative inline-block w-12 h-6 transition-colors duration-200 ease-in-out ${notifyNewMembers ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'} rounded-full`}>
                      <div className={`absolute top-1 w-4 h-4 transition-all duration-200 ease-in-out bg-white rounded-full ${notifyNewMembers ? 'left-7' : 'left-1'}`}></div>
                    </div>
                  </div>

                  {/* Aulas/Escola Bíblica */}
                  <div 
                    onClick={() => !saving && setNotifyLessons(!notifyLessons)}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-primary transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700 group-hover:text-primary transition-colors">
                         <Globe size={20} />
                      </div>
                      <div>
                         <p className="font-bold text-slate-900 dark:text-white">Lembretes de Escola Bíblica / Lições</p>
                         <p className="text-xs text-slate-500 dark:text-slate-400">Enviar lembretes e programações de novas lições e estudos</p>
                      </div>
                    </div>
                    <div className={`relative inline-block w-12 h-6 transition-colors duration-200 ease-in-out ${notifyLessons ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'} rounded-full`}>
                      <div className={`absolute top-1 w-4 h-4 transition-all duration-200 ease-in-out bg-white rounded-full ${notifyLessons ? 'left-7' : 'left-1'}`}></div>
                    </div>
                  </div>

                  {/* Saldo Financeiro Baixo */}
                  <div 
                    onClick={() => !saving && setNotifyLowBalance(!notifyLowBalance)}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-primary transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700 group-hover:text-primary transition-colors">
                         <Shield size={20} />
                      </div>
                      <div>
                         <p className="font-bold text-slate-900 dark:text-white">Alerta de Fluxo de Caixa / Saldo Baixo</p>
                         <p className="text-xs text-slate-500 dark:text-slate-400">Alertar a tesouraria se o caixa disponível estiver abaixo do limite mínimo</p>
                      </div>
                    </div>
                    <div className={`relative inline-block w-12 h-6 transition-colors duration-200 ease-in-out ${notifyLowBalance ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'} rounded-full`}>
                      <div className={`absolute top-1 w-4 h-4 transition-all duration-200 ease-in-out bg-white rounded-full ${notifyLowBalance ? 'left-7' : 'left-1'}`}></div>
                    </div>
                  </div>

                  {/* Aniversariantes */}
                  <div 
                    onClick={() => !saving && setNotifyBirthdays(!notifyBirthdays)}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-primary transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700 group-hover:text-primary transition-colors">
                         <Clock size={20} />
                      </div>
                      <div>
                         <p className="font-bold text-slate-900 dark:text-white">Alertas de Aniversário dos Membros</p>
                         <p className="text-xs text-slate-500 dark:text-slate-400">Mostrar avisos e notificações nos aniversários dos membros ativos</p>
                      </div>
                    </div>
                    <div className={`relative inline-block w-12 h-6 transition-colors duration-200 ease-in-out ${notifyBirthdays ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'} rounded-full`}>
                      <div className={`absolute top-1 w-4 h-4 transition-all duration-200 ease-in-out bg-white rounded-full ${notifyBirthdays ? 'left-7' : 'left-1'}`}></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-8 flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="flex items-center gap-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                <h3 className="text-xl font-black font-headline text-slate-900 dark:text-white uppercase">Diagnóstico do Banco de Dados</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Verifique a sincronização das tabelas no Supabase</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Diagnóstico Table Status */}
                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Database className="text-primary" size={18} />
                      Status das Tabelas
                    </h4>
                    <button
                      onClick={checkDatabaseTables}
                      disabled={checkingDb}
                      className="text-xs bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all"
                    >
                      <RefreshCw size={12} className={checkingDb ? 'animate-spin' : ''} />
                      Recarregar
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Verificação direta de presença dos esquemas públicos na sua instância do Supabase.
                  </p>

                  <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                    {['igrejas', 'perfis', 'usuarios', 'membros', 'comunidades', 'lecoes', 'presencas', 'configuracoes_sistema', 'transacoes'].map((tableName) => {
                      const status = dbStatus[tableName];
                      return (
                        <div key={tableName} className="flex items-center justify-between p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                          <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{tableName}</span>
                          <div>
                            {status?.loading ? (
                              <RefreshCw size={14} className="animate-spin text-slate-400" />
                            ) : status?.exists ? (
                              <span className="inline-flex items-center gap-1 font-bold text-green-600 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-full">
                                <CheckCircle size={12} />
                                Ativa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-full" title={status?.error}>
                                <AlertTriangle size={12} />
                                Não Encontrada
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        checkDatabaseTables();
                      }}
                      className="w-full text-center py-3 bg-primary text-white hover:opacity-90 rounded-xl font-bold text-xs transition-all tracking-wider uppercase block"
                    >
                      Reverificar Conexão das Tabelas
                    </button>
                  </div>
                </div>

                {/* Sincronização Panel */}
                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800/80 space-y-4 flex flex-col">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="text-amber-500" size={18} />
                    Como Resolver
                  </h4>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Se alguma tabela estiver marcada como <span className="text-red-500 font-bold">Não Encontrada</span>, copie o script de criação abaixo e execute-o como uma nova consulta no <b>SQL Editor</b> do seu painel do Supabase.
                  </p>

                  <div className="flex-1 min-h-[160px] max-h-[300px] bg-slate-900 text-slate-300 rounded-2xl p-4 font-mono text-[10px] overflow-y-auto border border-slate-850 relative">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(schemaSql || '');
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="absolute right-3 top-3 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                      title="Copiar SQL completo"
                    >
                      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                    <pre className="whitespace-pre-wrap">{schemaSql ? schemaSql.substring(0, 1000) + '\n  -- [... resto do script de criação ...]' : 'Carregando script de banco de dados...'}</pre>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(schemaSql || '');
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="w-full py-2.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-250 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    {copied ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                    {copied ? 'Copiado para Área de Transferência!' : 'Copiar Script SQL Completo (DDL)'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

