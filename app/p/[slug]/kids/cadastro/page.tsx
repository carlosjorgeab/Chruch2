'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Smile, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  Heart, 
  Calendar, 
  Shield, 
  Clock, 
  Activity,
  Copy,
  ExternalLink,
  Globe 
} from 'lucide-react';

export default function PublicKidsRegistration() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const salaId = searchParams?.get('sala') as string;

  const [igreja, setIgreja] = useState<any>(null);
  const [sala, setSala] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form states
  const [nomeCrianca, setNomeCrianca] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [telefoneResponsavel, setTelefoneResponsavel] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('Masculino');
  const [necessidadesEspeciais, setNecessidadesEspeciais] = useState('');
  const [restricoesAlimentares, setRestricoesAlimentares] = useState('');
  const [observacoesMedicas, setObservacoesMedicas] = useState('');
  const [autorizaImagem, setAutorizaImagem] = useState(false);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [registeredChildId, setRegisteredChildId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;

    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // 1. Fetch church by slug
        const { data: churchData, error: errChurch } = await supabase
          .from('igrejas')
          .select('*')
          .eq('slug', slug.toLowerCase().trim())
          .eq('ativo', true)
          .maybeSingle();

        if (errChurch || !churchData) {
          setErrorMsg('Igreja não encontrada ou desativada.');
          setLoading(false);
          return;
        }

        setIgreja(churchData);

        // 2. Fetch room (sala) by ID
        if (!salaId) {
          setErrorMsg('Sala não especificada. Por favor, escaneie o QR Code correto.');
          setLoading(false);
          return;
        }

        const { data: salaData, error: errSala } = await supabase
          .from('kids_salas')
          .select('*')
          .eq('id', salaId)
          .maybeSingle();

        if (errSala || !salaData) {
          setErrorMsg('Sala não encontrada para este cadastro.');
          setLoading(false);
          return;
        }

        setSala(salaData);
      } catch (err) {
        console.error('Error loading registration page:', err);
        setErrorMsg('Erro ao carregar formulário de cadastro público.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [slug, salaId]);

  const calculateAge = (birthDateString: string) => {
    if (!birthDateString) return 0;
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!nomeCrianca.trim() || !nomeResponsavel.trim() || !telefoneResponsavel.trim() || !dataNascimento) {
      setValidationError('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    // Verify age restrictions
    const childAge = calculateAge(dataNascimento);
    if (sala) {
      const minAge = sala.idade_minima || 0;
      const maxAge = sala.idade_maxima || 100;

      if (childAge < minAge || childAge > maxAge) {
        setValidationError(`A idade da criança (${childAge} anos) está fora da faixa permitida para esta sala (${minAge} a ${maxAge} anos).`);
        return;
      }
    }

    try {
      setSubmitting(true);

      // Insert new kid check-in / student record as "Visitante"
      const { data: insertedChild, error: insertErr } = await supabase
        .from('kids_sala_criancas')
        .insert({
          id_sala: sala.id,
          tipo_crianca: 'Visitante',
          nome_visitante: nomeCrianca.trim(),
          nome_responsavel: nomeResponsavel.trim(),
          telefone_responsavel: telefoneResponsavel.trim(),
          data_nascimento: dataNascimento,
          sexo,
          necessidades_especiais: necessidadesEspeciais.trim() || null,
          restricoes_alimentares: restricoesAlimentares.trim() || null,
          observacoes_medicas: observacoesMedicas.trim() || null,
          autoriza_imagem: autorizaImagem
        })
        .select('id')
        .single();

      if (insertErr || !insertedChild) {
        console.error('Database insert error:', insertErr);
        throw new Error('Falha ao salvar o cadastro.');
      }

      setRegisteredChildId(insertedChild.id);
      setSuccess(true);
    } catch (err: any) {
      setValidationError('Erro ao registrar a criança. Por favor, tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
        <div className="w-12 h-12 border-4 border-[#E4A232] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold uppercase tracking-widest text-xs">Carregando formulário de cadastro...</p>
      </div>
    );
  }

  if (errorMsg || !igreja) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-950 p-10 rounded-[2.5rem] shadow-xl text-center space-y-6 border border-slate-100 dark:border-slate-850">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
            <Info size={32} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Cadastro Não Disponível</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm leading-relaxed">
              {errorMsg || 'Esta igreja ou sala não foi encontrada ou seu acesso de cadastro está indisponível no momento.'}
            </p>
          </div>
          <button 
            onClick={() => router.push(`/p/${slug}`)}
            className="w-full bg-slate-900 dark:bg-slate-800 text-white font-black py-3.5 rounded-xl hover:opacity-90 transition-all uppercase text-xs tracking-widest cursor-pointer"
          >
            Voltar para Igreja
          </button>
        </div>
      </div>
    );
  }

  const corFundo = igreja.cor_fundo || '#f8fafc';
  const corPaineis = igreja.cor_paineis || '#ffffff';
  const corBordas = igreja.cor_bordas || '#e2e8f0';
  const corFontes = igreja.cor_fontes || '#0f172a';
  const corBotoes = igreja.cor_botoes || '#E4A232';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --church-bg: ${corFundo};
          --church-panel: ${corPaineis};
          --church-border: ${corBordas};
          --church-font: ${corFontes};
          --church-button: ${corBotoes};
        }
        
        .register-page-wrapper {
          background-color: var(--church-bg) !important;
          color: var(--church-font) !important;
        }

        .register-panel {
          background-color: var(--church-panel) !important;
          border-color: var(--church-border) !important;
        }

        .register-btn-primary {
          background-color: var(--church-button) !important;
          color: #ffffff !important;
        }
      `}} />

      <div className="register-page-wrapper min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
        <div className="max-w-2xl w-full space-y-6">

          {/* Header Card */}
          <div className="register-panel border rounded-3xl p-6 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {igreja.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={igreja.logo_url} 
                  alt={igreja.nome} 
                  className="w-12 h-12 object-contain rounded-xl bg-white p-0.5 border"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 bg-amber-500 text-white font-sans font-black text-lg flex items-center justify-center rounded-xl uppercase">
                  {igreja.nome.substring(0, 2)}
                </div>
              )}
              <div>
                <h1 className="text-lg font-black uppercase tracking-tight">{igreja.nome}</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Módulo Kids &bull; Cadastro Externo</p>
              </div>
            </div>
            
            <button
              onClick={() => router.push(`/p/${slug}`)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Voltar ao mural"
            >
              <ArrowLeft size={18} />
            </button>
          </div>

          {/* Main Form Panel */}
          <div className="register-panel border rounded-[2.5rem] p-8 shadow-md space-y-8">
            
            {success ? (
              <div className="text-center py-8 space-y-6">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 size={36} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    Cadastro Realizado com Sucesso!
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    A criança foi registrada com sucesso na sala <strong className="text-slate-800 dark:text-white font-bold">{sala?.nome}</strong>. 
                    O líder da sala já pode visualizar a criança na listagem de check-in ativa.
                  </p>
                </div>

                {/* Acompanhamento / Follow up Section */}
                {(() => {
                  const publicPageUrl = typeof window !== 'undefined' && registeredChildId ? `${window.location.origin}/p/kids/${registeredChildId}` : '';
                  if (!publicPageUrl) return null;
                  
                  return (
                    <div className="p-6 bg-amber-500/5 dark:bg-amber-500/10 rounded-3xl border border-amber-500/20 text-left space-y-4 max-w-md mx-auto">
                      <div className="flex items-center gap-2">
                        <Globe size={18} className="text-amber-500" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
                          Página de Acompanhamento Online
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                        Use o link exclusivo abaixo para acompanhar o status da criança em tempo real, visualizar os comunicados, avisos, cardápio e as programações.
                      </p>
                      
                      <div className="font-mono text-[10px] break-all bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-850 dark:text-slate-200">
                        {publicPageUrl}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(publicPageUrl);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Copy size={12} />
                          {copied ? 'Copiado!' : 'Copiar Link'}
                        </button>

                        <a
                          href={publicPageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2 px-3 register-btn-primary font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all text-center shadow-sm"
                        >
                          <ExternalLink size={12} />
                          Acessar Página
                        </a>
                      </div>
                    </div>
                  );
                })()}

                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      setSuccess(false);
                      setNomeCrianca('');
                      setDataNascimento('');
                      setNecessidadesEspeciais('');
                      setRestricoesAlimentares('');
                      setObservacoesMedicas('');
                      setAutorizaImagem(false);
                      setRegisteredChildId(null);
                    }}
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-xl text-xs uppercase tracking-widest transition"
                  >
                    Novo Cadastro
                  </button>
                  <button
                    onClick={() => router.push(`/p/${slug}`)}
                    className="px-6 py-3 register-btn-primary font-bold rounded-xl text-xs uppercase tracking-widest transition shadow-md hover:opacity-90"
                  >
                    Voltar para Igreja
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Smile size={20} className="text-amber-500" />
                    <h2 className="text-base font-black uppercase tracking-widest">
                      Formulário de Entrada ({sala?.nome})
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    Preencha os dados da criança e os contatos do responsável para entrada segura.
                  </p>

                  {/* Room metadata tags */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/15 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                      <Clock size={10} /> Faixa: {sala?.idade_minima || 0} a {sala?.idade_maxima || 12} anos
                    </span>
                    <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/15 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                      <Activity size={10} /> Status: {sala?.status || 'Aberto'}
                    </span>
                  </div>
                </div>

                {validationError && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-amber-800 dark:text-amber-400">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold leading-relaxed">{validationError}</p>
                  </div>
                )}

                {/* Section 1: Child details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">1. Dados da Criança</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-1 sm:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Nome Completo da Criança *
                      </label>
                      <input
                        type="text"
                        required
                        value={nomeCrianca}
                        onChange={(e) => setNomeCrianca(e.target.value)}
                        placeholder="Ex: João Silva Medeiros"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Data de Nascimento *
                      </label>
                      <input
                        type="date"
                        required
                        value={dataNascimento}
                        onChange={(e) => {
                          setDataNascimento(e.target.value);
                          setValidationError(null);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Gênero / Sexo *
                      </label>
                      <select
                        value={sexo}
                        onChange={(e) => setSexo(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-amber-500 transition-colors"
                      >
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Parent / Guardian details */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">2. Dados dos Responsáveis</h3>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Nome do Responsável *
                      </label>
                      <input
                        type="text"
                        required
                        value={nomeResponsavel}
                        onChange={(e) => setNomeResponsavel(e.target.value)}
                        placeholder="Ex: Maria Silva Medeiros (Mãe)"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Telefone do Responsável *
                      </label>
                      <input
                        type="tel"
                        required
                        value={telefoneResponsavel}
                        onChange={(e) => setTelefoneResponsavel(e.target.value)}
                        placeholder="Ex: (11) 99999-9999"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Medical / Special alerts */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">3. Informações Médicas & Alertas</h3>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Necessidades Especiais (Se houver)
                      </label>
                      <textarea
                        rows={2}
                        value={necessidadesEspeciais}
                        onChange={(e) => setNecessidadesEspeciais(e.target.value)}
                        placeholder="Descreva aqui se a criança possui autismo, TDAH, deficiências ou outras necessidades especiais."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs font-semibold focus:outline-none focus:border-amber-500 transition-colors resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Alergias ou Restrições Alimentares
                      </label>
                      <textarea
                        rows={2}
                        value={restricoesAlimentares}
                        onChange={(e) => setRestricoesAlimentares(e.target.value)}
                        placeholder="Ex: Alergia a glúten, intolerância a lactose, amendoim, etc."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs font-semibold focus:outline-none focus:border-amber-500 transition-colors resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Observações Médicas / Remédios
                      </label>
                      <textarea
                        rows={2}
                        value={observacoesMedicas}
                        onChange={(e) => setObservacoesMedicas(e.target.value)}
                        placeholder="Ex: Tomando antibiótico às 10h, evitar atividades físicas intensas, etc."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs font-semibold focus:outline-none focus:border-amber-500 transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Terms and Consent */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">4. Autorizações</h3>

                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autorizaImagem}
                      onChange={(e) => setAutorizaImagem(e.target.checked)}
                      className="mt-1 h-4 w-4 text-amber-500 focus:ring-amber-500 border-slate-300 rounded cursor-pointer"
                    />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Autorizo o uso de imagem da criança para fins ministeriais
                      </p>
                      <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">
                        Autorizo a igreja a divulgar fotos ou vídeos da criança em boletins internos, site institucional ou redes sociais oficiais da igreja, preservando sempre a dignidade e integridade do menor.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Submit button */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800/60">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 register-btn-primary rounded-xl font-black uppercase text-xs tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Enviando Cadastro...
                      </>
                    ) : (
                      'Concluir Entrada'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Page footer */}
          <footer className="text-center text-[10px] text-slate-450 font-black uppercase tracking-widest flex items-center justify-center gap-1">
            <Shield size={12} className="text-amber-500" /> Cadastro Seguro de Entrada Kids
          </footer>

        </div>
      </div>
    </>
  );
}
