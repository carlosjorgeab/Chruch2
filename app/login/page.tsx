'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, ArrowLeft, Mail, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, loading } = useAuth();

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);

  // Recovery views: 'login' | 'forgot' | 'verify' | 'reset'
  const [view, setView] = useState<'login' | 'forgot' | 'verify' | 'reset'>('login');
  
  // Recovery state variables
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [sentViaSmtp, setSentViaSmtp] = useState(false);
  const [searchBy, setSearchBy] = useState<'email' | 'nome'>('email');
  const [recoveryName, setRecoveryName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email || !senha) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    const result = await login(email, senha);
    if (result.error) {
      setError(result.error);
    }
  };

  const handleSendRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSentViaSmtp(false);
    setTargetUserId(null);

    let targetEmail = '';
    let userName = 'Membro';
    let userId = '';
    let userIgrejaId = '';

    if (searchBy === 'email') {
      if (!recoveryEmail) {
        setError('Por favor, informe seu e-mail.');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recoveryEmail.trim())) {
        setError('O e-mail informado não possui um formato correto para recuperação de senha.');
        return;
      }
      targetEmail = recoveryEmail.trim();
    } else {
      if (!recoveryName) {
        setError('Por favor, informe o nome completo cadastrado.');
        return;
      }
      if (!customEmail) {
        setError('Por favor, informe o e-mail correto para recebimento.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customEmail.trim())) {
        setError('O e-mail informado não possui um formato correto para recuperação de senha.');
        return;
      }
      targetEmail = customEmail.trim();
    }

    setRecoveryLoading(true);
    try {
      let query = supabase.from('usuarios').select('id, nome, email, id_igreja');

      if (searchBy === 'email') {
        query = query.eq('email', recoveryEmail.trim());
      } else {
        query = query.ilike('nome', `%${recoveryName.trim()}%`);
      }

      const { data, error: fetchErr } = await query.limit(1).maybeSingle();

      if (fetchErr) throw fetchErr;

      if (!data) {
        if (searchBy === 'email') {
          setError('E-mail não encontrado no sistema.');
        } else {
          setError('Nenhum usuário cadastrado encontrado com este Nome.');
        }
        setRecoveryLoading(false);
        return;
      }

      userId = data.id;
      userName = data.nome || 'Membro';
      userIgrejaId = data.id_igreja || '';
      setTargetUserId(userId);

      // Generate a 6-digit numeric recovery code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setRecoveryCode(code);

      // Fetch SMTP configuration from database
      const { data: configs, error: configErr } = await supabase
        .from('configuracoes_sistema')
        .select('*');

      if (configErr) throw configErr;

      let smtpHost = '';
      let smtpPort = '587';
      let smtpUser = '';
      let smtpPass = '';
      let smtpFrom = '';
      let smtpSSL = 'true';

      if (configs) {
        configs.forEach((config: any) => {
          if (config.chave === 'smtp_host') smtpHost = config.valor;
          if (config.chave === 'smtp_port') smtpPort = config.valor;
          if (config.chave === 'smtp_user') smtpUser = config.valor;
          if (config.chave === 'smtp_pass') smtpPass = config.valor;
          if (config.chave === 'smtp_from') smtpFrom = config.valor;
          if (config.chave === 'smtp_ssl') smtpSSL = config.valor;
        });

        // Church-specific overrides if the user is linked to an igreja
        if (userIgrejaId) {
          configs.forEach((config: any) => {
            if (config.chave === `smtp_host_${userIgrejaId}`) smtpHost = config.valor;
            if (config.chave === `smtp_port_${userIgrejaId}`) smtpPort = config.valor;
            if (config.chave === `smtp_user_${userIgrejaId}`) smtpUser = config.valor;
            if (config.chave === `smtp_pass_${userIgrejaId}`) smtpPass = config.valor;
            if (config.chave === `smtp_from_${userIgrejaId}`) smtpFrom = config.valor;
            if (config.chave === `smtp_ssl_${userIgrejaId}`) smtpSSL = config.valor;
          });
        }
      }

      if (smtpHost && smtpUser && smtpPass && smtpFrom) {
        // Send email via our custom SMTP API route
        const response = await fetch('/api/send-recovery-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: smtpHost,
            port: smtpPort,
            user: smtpUser,
            pass: smtpPass,
            from: smtpFrom,
            secure: smtpSSL === 'true',
            to: targetEmail,
            code,
            userName,
          }),
        });

        const resData = await response.json();
        if (!response.ok) {
          throw new Error(resData.error || 'Erro desconhecido ao enviar e-mail.');
        }

        setSentViaSmtp(true);
        setSuccess(`Código de recuperação enviado para o e-mail: ${targetEmail}`);
      } else {
        // SMTP not configured, fallback gracefully so preview environment is always testable
        setSentViaSmtp(false);
        setSuccess(`[Demonstração] O SMTP não está configurado. O código de recuperação foi gerado.`);
      }
      setView('verify');
    } catch (err: any) {
      setError(`Erro ao processar recuperação de senha: ${err.message || err}`);
      console.error(err);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!enteredCode) {
      setError('Por favor, insira o código de verificação.');
      return;
    }

    if (enteredCode !== recoveryCode) {
      setError('Código incorreto. Verifique o código e tente novamente.');
      return;
    }

    setSuccess('Código verificado com sucesso! Crie uma nova senha.');
    setView('reset');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!novaSenha || !confirmarNovaSenha) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (novaSenha.length < 6) {
      setError('A nova senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      setError('As senhas não coincidem.');
      return;
    }

    setRecoveryLoading(true);
    try {
      const updateData: any = { senha: novaSenha };
      
      // If search was by name and custom email was provided, also update email in user row
      if (searchBy === 'nome' && customEmail && targetUserId) {
        updateData.email = customEmail.trim();
      }

      const query = supabase.from('usuarios').update(updateData);
      
      const { error: updateErr } = targetUserId
        ? await query.eq('id', targetUserId)
        : await query.eq('email', recoveryEmail.trim());

      if (updateErr) throw updateErr;

      setSuccess('Sua senha foi redefinida com sucesso! Use a nova senha para entrar.');
      setEmail(searchBy === 'nome' ? customEmail : recoveryEmail); // Autofill email for login convenience
      setSenha('');
      setView('login');
      // Clear recovery state
      setRecoveryEmail('');
      setRecoveryCode('');
      setEnteredCode('');
      setNovaSenha('');
      setConfirmarNovaSenha('');
      setRecoveryName('');
      setCustomEmail('');
      setTargetUserId(null);
    } catch (err: any) {
      setError('Erro ao redefinir a senha. Tente novamente.');
      console.error(err);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setError('');
    setSuccess('');
    setView('login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 transition-colors duration-300 font-['Inter']">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 p-8 sm:p-10 space-y-8 relative">
        
        {view === 'login' && (
          <>
            <div className="flex flex-col items-center justify-center">
              <Logo className="w-16 h-16 mb-4" />
              <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight text-center">
                Church Management
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mt-1 text-center">
                Acesso ao Painel
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-2xl text-red-650 dark:text-red-400 text-xs font-bold text-center">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-850 rounded-2xl text-emerald-700 dark:text-emerald-400 text-xs font-bold text-center">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  E-mail ou Usuário
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-secondary transition-all outline-none font-bold text-sm"
                  placeholder="admin ou seu@email.com"
                  disabled={loading}
                />
              </div>

              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                    Senha
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full pl-4 pr-12 py-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-secondary transition-all outline-none font-bold text-sm"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                <div className="text-right mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setView('forgot');
                      setError('');
                      setSuccess('');
                    }}
                    className="text-[10px] font-bold text-secondary hover:underline uppercase tracking-wider"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
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
          </>
        )}

        {view === 'forgot' && (
          <>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold transition uppercase tracking-wider"
              >
                <ArrowLeft size={16} /> Voltar ao login
              </button>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Recuperar Senha
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed mt-1">
                  {searchBy === 'email' 
                    ? 'Informe o e-mail cadastrado na sua conta para enviarmos o código de recuperação.'
                    : 'Busque sua conta pelo nome e informe um e-mail correto para receber o código.'}
                </p>
              </div>
            </div>

            {/* Tab Selector */}
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSearchBy('email');
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                  searchBy === 'email'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-550 dark:text-slate-450 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Por E-mail
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchBy('nome');
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                  searchBy === 'nome'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-550 dark:text-slate-450 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Por Nome
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-2xl text-red-650 dark:text-red-400 text-xs font-bold text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSendRecoveryCode} className="space-y-6">
              {searchBy === 'email' ? (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    E-mail Cadastrado
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail size={18} />
                    </span>
                    <input
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-secondary transition-all outline-none font-bold text-sm"
                      placeholder="exemplo@igreja.com"
                      disabled={recoveryLoading}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      Seu Nome Completo (Conforme Cadastro)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={recoveryName}
                        onChange={(e) => setRecoveryName(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-secondary transition-all outline-none font-bold text-sm"
                        placeholder="Insira seu nome completo"
                        disabled={recoveryLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      E-mail Correto para Recebimento do Código
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Mail size={18} />
                      </span>
                      <input
                        type="email"
                        required
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-secondary transition-all outline-none font-bold text-sm"
                        placeholder="seu-email-correto@exemplo.com"
                        disabled={recoveryLoading}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold mt-1.5 ml-1 leading-relaxed">
                      * Se o e-mail em seu cadastro do sistema estiver desatualizado ou incorreto, informe um e-mail válido neste campo para receber o código de segurança.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={recoveryLoading}
                className="w-full py-4 px-4 bg-secondary hover:bg-secondary/90 text-white font-black rounded-xl shadow-lg shadow-secondary/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center uppercase text-xs tracking-widest"
              >
                {recoveryLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  'Gerar Código'
                )}
              </button>
            </form>
          </>
        )}

        {view === 'verify' && (
          <>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setView('forgot')}
                className="flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold transition uppercase tracking-wider"
              >
                <ArrowLeft size={16} /> Voltar
              </button>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Verificar Código
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed mt-1">
                  Inserimos um código de segurança no seu e-mail de recuperação. Insira-o abaixo.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-2xl text-red-650 dark:text-red-400 text-xs font-bold text-center">
                {error}
              </div>
            )}

            {sentViaSmtp ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 rounded-2xl">
                <p className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-400 tracking-wider">
                  E-mail Enviado com Sucesso
                </p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                  O código de recuperação foi enviado para o e-mail cadastrado <strong className="text-secondary">{recoveryEmail}</strong> utilizando o Servidor SMTP Customizado. Por favor, verifique sua caixa de entrada e de spam.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/40 rounded-2xl">
                <p className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-400 tracking-wider">
                  Código Gerado (Demonstração / Sem SMTP)
                </p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                  Como as configurações de SMTP Customizado não foram totalmente preenchidas no sistema, o código foi gerado abaixo para fins de demonstração:
                </p>
                <div className="mt-2.5 flex justify-center">
                  <span className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-lg font-black tracking-[0.4em] pl-2.5 py-1.5 rounded-xl text-center shadow-sm select-all">
                    {recoveryCode}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  Código de 6 dígitos
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <KeyRound size={18} />
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-secondary transition-all outline-none font-bold text-center text-lg tracking-[0.2em]"
                    placeholder="000000"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 px-4 bg-secondary hover:bg-secondary/90 text-white font-black rounded-xl shadow-lg shadow-secondary/20 transition-all active:scale-95 flex items-center justify-center uppercase text-xs tracking-widest"
              >
                Verificar Código
              </button>
            </form>
          </>
        )}

        {view === 'reset' && (
          <>
            <div className="space-y-3">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Criar Nova Senha
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed mt-1">
                  Defina sua nova senha de acesso de forma segura para <strong className="text-secondary">{recoveryEmail}</strong>
                </p>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-2xl text-red-650 dark:text-red-400 text-xs font-bold text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-secondary transition-all outline-none font-bold text-sm"
                    placeholder="No mínimo 6 caracteres"
                    disabled={recoveryLoading}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmarNovaSenha}
                    onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-secondary transition-all outline-none font-bold text-sm"
                    placeholder="Repita a nova senha"
                    disabled={recoveryLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={recoveryLoading}
                className="w-full py-4 px-4 bg-secondary hover:bg-secondary/90 text-white font-black rounded-xl shadow-lg shadow-secondary/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center uppercase text-xs tracking-widest"
              >
                {recoveryLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  'Redefinir e Salvar Senha'
                )}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}
