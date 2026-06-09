'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !senha) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    const result = await login(email, senha);
    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-8">
          <div className="flex flex-col items-center justify-center mb-8">
            <Logo className="w-16 h-16 mb-4" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight text-center">
              Chruch Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 text-center">
              Acesso ao Painel
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-bold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                E-mail ou Usuário
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-secondary transition-all outline-none font-bold"
                placeholder="admin ou seu@email.com"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-secondary transition-all outline-none font-bold"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-4 bg-secondary hover:bg-secondary/90 text-white font-black rounded-xl shadow-lg shadow-secondary/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center uppercase text-xs tracking-widest"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
