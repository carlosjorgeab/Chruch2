'use client';
import { useState, useEffect } from 'react';
import { Settings, Save, Bell, Shield, Globe, Moon, Clock, Lock, MonitorStop, RefreshCw, CheckCircle, AlertTriangle, Database, FileText, Copy, Check, UserPlus, Cake, BookOpen, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { defaultTranslations } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { useIgreja } from '@/context/IgrejaContext';

export default function ConfiguracoesPage() {
  const { user, hasPermission } = useAuth();
  const { selectedIgreja } = useIgreja();
  
  const canEdit = user?.id_master || user?.is_admin || false;

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
  const [reminderValue, setReminderValue] = useState('60');
  const [reminderUnit, setReminderUnit] = useState('minutos');

  // SMTP configuration states
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpSSL, setSmtpSSL] = useState(true);

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

  useEffect(() => {
    if (mounted) {
      fetchConfigs();
    }
  }, [selectedIgreja?.id]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('*');

      if (error) throw error;

      if (data) {
        let val = '60';
        let unit = 'minutos';
        let sHost = '';
        let sPort = '587';
        let sUser = '';
        let sPass = '';
        let sFrom = '';
        let sSSL = 'true';
        data.forEach((config: any) => {
          if (config.chave === 'session_timeout') setSessionTimeout(config.valor);
          if (config.chave === 'disable_multi_login') setDisableMultiLogin(config.valor === 'true');
          if (config.chave === 'language_default') setLanguage(config.valor);
          if (config.chave === 'notify_new_members') setNotifyNewMembers(config.valor === 'true');
          if (config.chave === 'notify_lessons') setNotifyLessons(config.valor === 'true');
          if (config.chave === 'notify_low_balance') setNotifyLowBalance(config.valor === 'true');
          if (config.chave === 'notify_birthdays') setNotifyBirthdays(config.valor === 'true');
          if (config.chave === 'event_reminder_value') val = config.valor;
          if (config.chave === 'event_reminder_unit') unit = config.valor;
          if (config.chave === 'smtp_host') sHost = config.valor;
          if (config.chave === 'smtp_port') sPort = config.valor;
          if (config.chave === 'smtp_user') sUser = config.valor;
          if (config.chave === 'smtp_pass') sPass = config.valor;
          if (config.chave === 'smtp_from') sFrom = config.valor;
          if (config.chave === 'smtp_ssl') sSSL = config.valor;
        });

        // Church specific overrides
        data.forEach((config: any) => {
          if (selectedIgreja?.id) {
            if (config.chave === `event_reminder_value_${selectedIgreja.id}`) val = config.valor;
            if (config.chave === `event_reminder_unit_${selectedIgreja.id}`) unit = config.valor;
            if (config.chave === `smtp_host_${selectedIgreja.id}`) sHost = config.valor;
            if (config.chave === `smtp_port_${selectedIgreja.id}`) sPort = config.valor;
            if (config.chave === `smtp_user_${selectedIgreja.id}`) sUser = config.valor;
            if (config.chave === `smtp_pass_${selectedIgreja.id}`) sPass = config.valor;
            if (config.chave === `smtp_from_${selectedIgreja.id}`) sFrom = config.valor;
            if (config.chave === `smtp_ssl_${selectedIgreja.id}`) sSSL = config.valor;
          }
        });

        setReminderValue(val);
        setReminderUnit(unit);
        setSmtpHost(sHost);
        setSmtpPort(sPort);
        setSmtpUser(sUser);
        setSmtpPass(sPass);
        setSmtpFrom(sFrom);
        setSmtpSSL(sSSL === 'true');
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
    if (!canEdit) {
      setStatusMessage({ type: 'error', text: 'Você não possui as permissões necessárias nos módulos de Usuários e Perfil para salvar estas alterações.' });
      return;
    }
    try {
      setSaving(true);
      setStatusMessage(null);
      const themeVal = darkMode ? 'dark' : 'light';
      
      // Save to localStorage for immediate client-side effect
      localStorage.setItem('theme', themeVal);
      localStorage.setItem('session_timeout', sessionTimeout);
      localStorage.setItem('disable_multi_login', String(disableMultiLogin));
      if (selectedIgreja?.id) {
        localStorage.setItem(`event_reminder_value_${selectedIgreja.id}`, String(reminderValue));
        localStorage.setItem(`event_reminder_unit_${selectedIgreja.id}`, reminderUnit);
      }
      localStorage.setItem('event_reminder_value', String(reminderValue));
      localStorage.setItem('event_reminder_unit', reminderUnit);

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

      if (selectedIgreja?.id) {
        updates.push(
          { chave: `event_reminder_value_${selectedIgreja.id}`, valor: String(reminderValue) },
          { chave: `event_reminder_unit_${selectedIgreja.id}`, valor: reminderUnit },
          { chave: `smtp_host_${selectedIgreja.id}`, valor: smtpHost },
          { chave: `smtp_port_${selectedIgreja.id}`, valor: smtpPort },
          { chave: `smtp_user_${selectedIgreja.id}`, valor: smtpUser },
          { chave: `smtp_pass_${selectedIgreja.id}`, valor: smtpPass },
          { chave: `smtp_from_${selectedIgreja.id}`, valor: smtpFrom },
          { chave: `smtp_ssl_${selectedIgreja.id}`, valor: String(smtpSSL) }
        );
      } else {
        updates.push(
          { chave: 'event_reminder_value', valor: String(reminderValue) },
          { chave: 'event_reminder_unit', valor: reminderUnit },
          { chave: 'smtp_host', valor: smtpHost },
          { chave: 'smtp_port', valor: smtpPort },
          { chave: 'smtp_user', valor: smtpUser },
          { chave: 'smtp_pass', valor: smtpPass },
          { chave: 'smtp_from', valor: smtpFrom },
          { chave: 'smtp_ssl', valor: String(smtpSSL) }
        );
      }

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
    { id: 'servidores', label: 'Servidores', icon: Mail },
    { id: 'database', label: 'Banco de Dados', icon: Database },
  ];

  const allowedTabs = tabs.filter(tab => {
    if (user?.id_master) return true;
    if (user?.is_admin) {
      return tab.id === 'geral' || tab.id === 'notificacoes';
    }
    return false;
  });

  if (!mounted) return null;

  if (!user?.id_master && !user?.is_admin) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 text-center space-y-4">
          <div className="w-16 h-16 bg-transparent text-red-650 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto">
            <Settings size={36} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Acesso Restrito</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Somente usuários Administradores ou Master do sistema têm acesso a este módulo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="configuracoes-page p-8 space-y-8 max-w-5xl mx-auto">
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

      {!canEdit && (
        <div className="p-4 rounded-2xl flex items-center gap-3 font-bold text-sm border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-500 animate-in fade-in duration-300">
          <Lock size={20} className="text-amber-600 dark:text-amber-500" />
          <span>Apenas usuários com permissões específicas nos módulos de 'Usuários' e 'Perfil' podem alterar estas configurações.</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar de Configurações */}
        <div className="w-full md:w-64 space-y-2">
          {allowedTabs.map(tab => {
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
                  disabled={saving || loading || !canEdit}
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
                    const stateKey = `${language}_${key}`;
                    const currentOverride = overrides[stateKey] || '';
                    
                    return (
                      <div key={key} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-100/30 dark:hover:bg-slate-900/40 transition-all bg-transparent">
                        <div className="w-full md:w-1/3">
                          <p className="font-mono text-xs text-amber-600 dark:text-amber-500 font-bold">{key}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Padrão: <span className="italic">"{defaultText}"</span></p>
                        </div>
                        <div className="w-full md:w-2/3 flex gap-2">
                          <input
                            type="text"
                            value={editingTranslations[stateKey] !== undefined ? editingTranslations[stateKey] : (currentOverride || defaultText)}
                            onChange={(e) => {
                              setEditingTranslations(prev => ({
                                ...prev,
                                [stateKey]: e.target.value
                              }));
                            }}
                            className="w-full px-4 py-2 border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl text-sm focus:border-amber-500 outline-none font-semibold transition-all"
                            placeholder={defaultText}
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const val = editingTranslations[stateKey] !== undefined ? editingTranslations[stateKey] : (currentOverride || defaultText);
                              await saveOverride(key, val, language as any);
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
                    <p className="text-xs text-slate-500 dark:text-slate-400">Encerrar a sessao do usuario apos o periodo de inatividade configurado.</p>
                    <div className="flex items-center gap-4">
                      <input 
                        type="number" 
                        min="1" max="1440"
                        className="w-24 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 font-bold focus:border-primary outline-none text-slate-900 dark:text-white"
                        value={sessionTimeout}
                        onChange={(e) => setSessionTimeout(e.target.value)}
                        disabled={saving || !canEdit}
                      />
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Minutos</span>
                    </div>
                  </div>

                  {/* Login Simultâneo */}
                  <div 
                    onClick={() => !saving && canEdit && setDisableMultiLogin(!disableMultiLogin)}
                    className={`flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 transition-all group ${saving || !canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary'}`}
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
                  disabled={saving || loading || !canEdit}
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
                <div className="space-y-8">
                  {/* Categorized Grid Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category: Membresia & Comunidade */}
                    <div className="space-y-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                          <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
                            <UserPlus size={18} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest">Membresia & Comunidade</h4>
                            <p className="text-[10px] text-slate-400">Integração, celebrações e novos cadastros</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {/* Novos Membros */}
                          <div 
                            onClick={() => !saving && setNotifyNewMembers(!notifyNewMembers)}
                            className="flex items-start justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 cursor-pointer hover:border-amber-500/20 dark:hover:border-amber-500/10 transition group"
                          >
                            <div className="flex gap-3">
                              <div className="mt-0.5 w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-500 group-hover:scale-105 transition shrink-0">
                                <Bell size={16} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Novos Membros Cadastrados</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-1">Notificar toda vez que um novo membro se registrar ou for incluído</p>
                              </div>
                            </div>
                            <div className={`relative inline-block w-10 h-5 shrink-0 transition-colors duration-200 ease-in-out ${notifyNewMembers ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'} rounded-full mt-1`}>
                              <div className={`absolute top-0.5 w-4 h-4 transition-all duration-200 ease-in-out bg-white rounded-full ${notifyNewMembers ? 'left-5.5' : 'left-0.5'}`}></div>
                            </div>
                          </div>

                          {/* Aniversariantes */}
                          <div 
                            onClick={() => !saving && setNotifyBirthdays(!notifyBirthdays)}
                            className="flex items-start justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 cursor-pointer hover:border-amber-500/20 dark:hover:border-amber-500/10 transition group"
                          >
                            <div className="flex gap-3">
                              <div className="mt-0.5 w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-500 group-hover:scale-105 transition shrink-0">
                                <Cake size={16} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Aniversariantes do Dia</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-1">Exibir lembretes e comemorar os aniversariantes do dia</p>
                              </div>
                            </div>
                            <div className={`relative inline-block w-10 h-5 shrink-0 transition-colors duration-200 ease-in-out ${notifyBirthdays ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'} rounded-full mt-1`}>
                              <div className={`absolute top-0.5 w-4 h-4 transition-all duration-200 ease-in-out bg-white rounded-full ${notifyBirthdays ? 'left-5.5' : 'left-0.5'}`}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Category: Ensino & Fluxo Financeiro */}
                    <div className="space-y-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                          <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
                            <BookOpen size={18} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest">Atividades & Finanças</h4>
                            <p className="text-[10px] text-slate-400">Escola bíblica, controle e auditoria de caixa</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {/* Aulas/Escola Bíblica */}
                          <div 
                            onClick={() => !saving && setNotifyLessons(!notifyLessons)}
                            className="flex items-start justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 cursor-pointer hover:border-amber-500/20 dark:hover:border-amber-500/10 transition group"
                          >
                            <div className="flex gap-3">
                              <div className="mt-0.5 w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-500 group-hover:scale-105 transition shrink-0">
                                <Globe size={16} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Lembretes de Escola Bíblica</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-1">Avisar sobre novas programações, lições e estudos bíblicos</p>
                              </div>
                            </div>
                            <div className={`relative inline-block w-10 h-5 shrink-0 transition-colors duration-200 ease-in-out ${notifyLessons ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'} rounded-full mt-1`}>
                              <div className={`absolute top-0.5 w-4 h-4 transition-all duration-200 ease-in-out bg-white rounded-full ${notifyLessons ? 'left-5.5' : 'left-0.5'}`}></div>
                            </div>
                          </div>

                          {/* Saldo Financeiro Baixo */}
                          <div 
                            onClick={() => !saving && setNotifyLowBalance(!notifyLowBalance)}
                            className="flex items-start justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 cursor-pointer hover:border-amber-500/20 dark:hover:border-amber-500/10 transition group"
                          >
                            <div className="flex gap-3">
                              <div className="mt-0.5 w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-500 group-hover:scale-105 transition shrink-0">
                                <Shield size={16} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Alerta de Fluxo de Caixa</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-1">Alertar a tesouraria se o caixa disponível estiver abaixo do limite mínimo</p>
                              </div>
                            </div>
                            <div className={`relative inline-block w-10 h-5 shrink-0 transition-colors duration-200 ease-in-out ${notifyLowBalance ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'} rounded-full mt-1`}>
                              <div className={`absolute top-0.5 w-4 h-4 transition-all duration-200 ease-in-out bg-white rounded-full ${notifyLowBalance ? 'left-5.5' : 'left-0.5'}`}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lembretes de Eventos - Destaque em largura total */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm space-y-6">
                    <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                        <Clock size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest">Lembretes de Eventos da Agenda</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Defina o tempo de antecedência padrão para os lembretes de eventos e programações da agenda</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Tempo de Antecedência
                        </label>
                        <div className="flex gap-3">
                          <input
                            type="number"
                            min="1"
                            value={reminderValue}
                            onChange={(e) => setReminderValue(e.target.value)}
                            className="w-1/2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white font-bold text-sm focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition outline-none"
                            disabled={saving}
                          />
                          <select
                            value={reminderUnit}
                            onChange={(e) => setReminderUnit(e.target.value)}
                            className="w-1/2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white font-bold text-sm focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition outline-none cursor-pointer"
                            disabled={saving}
                          >
                            <option value="minutos">Minutos</option>
                            <option value="horas">Horas</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-850">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          💡 <span className="font-bold text-slate-700 dark:text-slate-300">Como funciona:</span> O painel gerará alertas visuais e lembretes para cada evento registrado com exatos <span className="font-bold text-[#E4A232]">{reminderValue} {reminderUnit}</span> de antecedência do seu horário agendado de início.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              <div className="pt-8 flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={saving || loading || !canEdit}
                  className="flex items-center gap-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'servidores' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                <h3 className="text-xl font-black font-headline text-slate-900 dark:text-white uppercase">Servidores & Integrações</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Configure as conexões de servidores e SMTP do sistema</p>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <RefreshCw size={32} className="animate-spin mb-4" />
                  <p className="font-bold uppercase tracking-widest text-xs">Carregando...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* SMTP Custom Server Configuration - Beautiful Glassmorphic layout */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm space-y-6">
                    <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                        <Mail size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest">Servidor SMTP Customizado</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Configure um servidor SMTP personalizado para o envio de e-mails, alertas e relatórios da igreja</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Host SMTP
                        </label>
                        <input
                          type="text"
                          placeholder="ex: smtp.gmail.com"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white font-bold text-sm focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition outline-none"
                          disabled={saving}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Porta SMTP
                        </label>
                        <input
                          type="text"
                          placeholder="ex: 587"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white font-bold text-sm focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition outline-none"
                          disabled={saving}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Usuário SMTP
                        </label>
                        <input
                          type="text"
                          placeholder="ex: email@igreja.com"
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white font-bold text-sm focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition outline-none"
                          disabled={saving}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Senha SMTP
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••••••"
                          value={smtpPass}
                          onChange={(e) => setSmtpPass(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white font-bold text-sm focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition outline-none"
                          disabled={saving}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Remetente (E-mail de Origem)
                        </label>
                        <input
                          type="email"
                          placeholder="ex: nao-responder@igreja.com"
                          value={smtpFrom}
                          onChange={(e) => setSmtpFrom(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white font-bold text-sm focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition outline-none"
                          disabled={saving}
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => !saving && setSmtpSSL(!smtpSSL)}
                          className="flex items-start justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 cursor-pointer hover:border-amber-500/20 dark:hover:border-amber-500/10 transition group w-full"
                        >
                          <div className="flex gap-3">
                            <div className="mt-0.5 w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-500 group-hover:scale-105 transition shrink-0">
                              <Shield size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Requer conexão segura (SSL/TLS)</p>
                              <p className="text-[10px] text-slate-500 mt-1">Habilitar criptografia segura no canal</p>
                            </div>
                          </div>
                          <div className={`relative inline-block w-10 h-5 shrink-0 transition-colors duration-200 ease-in-out ${smtpSSL ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'} rounded-full mt-1`}>
                            <div className={`absolute top-0.5 w-4 h-4 transition-all duration-200 ease-in-out bg-white rounded-full ${smtpSSL ? 'left-5.5' : 'left-0.5'}`}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-8 flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={saving || loading || !canEdit}
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

