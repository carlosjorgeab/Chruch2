'use client';
import { useState, useEffect } from 'react';
import { Settings, Save, Bell, Shield, Globe, Moon, Clock, Lock, MonitorStop, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('geral');
  const [darkMode, setDarkMode] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [disableMultiLogin, setDisableMultiLogin] = useState(false);
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

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700">
                       <Globe size={20} />
                    </div>
                    <div>
                       <p className="font-bold text-slate-900 dark:text-white">Idioma do Sistema</p>
                       <p className="text-xs text-slate-500 dark:text-slate-400">Língua padrão da interface administrativa</p>
                    </div>
                  </div>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={saving}
                    className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold focus:border-primary outline-none text-slate-900 dark:text-white text-xs select-none"
                  >
                    <option value="pt">Português (Brasil)</option>
                    <option value="en">English (US)</option>
                    <option value="es">Español</option>
                  </select>
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
        </div>
      </div>
    </div>
  );
}

