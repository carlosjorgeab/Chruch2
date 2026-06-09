'use client';
import { useState, useEffect } from 'react';
import { Settings, Save, Bell, Shield, Globe, Moon, Clock, Lock, MonitorStop, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('geral');
  const [darkMode, setDarkMode] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [disableMultiLogin, setDisableMultiLogin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        data.forEach(config => {
          if (config.chave === 'session_timeout') setSessionTimeout(config.valor);
          if (config.chave === 'disable_multi_login') setDisableMultiLogin(config.valor === 'true');
          if (config.chave === 'theme_default') {
             // We prioritize user's local theme choice but could use this as fallback
          }
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
      const themeVal = darkMode ? 'dark' : 'light';
      
      // Save to localStorage for immediate client-side effect
      localStorage.setItem('theme', themeVal);
      localStorage.setItem('session_timeout', sessionTimeout);
      localStorage.setItem('disable_multi_login', String(disableMultiLogin));

      // 1. Update system-wide configurations
      const updates = [
        { chave: 'session_timeout', valor: sessionTimeout },
        { chave: 'disable_multi_login', valor: String(disableMultiLogin) },
        { chave: 'theme_default', valor: themeVal }
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

      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving configs:', error);
      alert('Erro ao salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'geral', label: 'Geral', icon: Settings },
    { id: 'seguranca', label: 'Segurança', icon: Shield },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
  ];

  if (!mounted) return null;

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <p className="text-sm font-bold text-primary uppercase tracking-widest mb-1">Sistema</p>
        <h2 className="text-3xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">Configurações</h2>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar de Configurações */}
        <div className="w-full md:w-64 space-y-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700">
                       <Globe size={20} />
                    </div>
                    <div>
                       <p className="font-bold text-slate-900 dark:text-white">Idioma do Sistema</p>
                       <p className="text-xs text-slate-500 dark:text-slate-400">Português (Brasil)</p>
                    </div>
                  </div>
                  <button className="text-primary text-xs font-bold uppercase tracking-widest hover:underline">Alterar</button>
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
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 italic">
               <Bell size={48} className="mb-4 opacity-10" />
               <p>Seção em desenvolvimento...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

