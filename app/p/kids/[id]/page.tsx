'use client';

import { useState, useEffect, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Calendar, 
  Megaphone, 
  RefreshCw, 
  Info, 
  ShieldAlert, 
  Heart, 
  User, 
  Phone, 
  UserCheck, 
  Clock, 
  MapPin, 
  Sparkles, 
  Star,
  FileText,
  AlertCircle,
  Eye,
  Activity,
  ArrowRight
} from 'lucide-react';

interface Programacao {
  id: string;
  descricao: string;
  data_hora: string;
}

interface Comunicado {
  id: string;
  id_sala: string;
  criancas_ids: any;
  tipo: string;
  descricao: string;
  arquivos: any;
  created_at: string;
}

export default function PublicChildOverview() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [child, setChild] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [sala, setSala] = useState<any>(null);
  const [turma, setTurma] = useState<any>(null);
  const [igreja, setIgreja] = useState<any>(null);
  const [programacoes, setProgramacoes] = useState<Programacao[]>([]);
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Helper to calculate age from birth date
  const getAgeFromBirthDate = (birthDateStr: string): string => {
    if (!birthDateStr) return '0';
    const cleanDateStr = birthDateStr.includes('T') ? birthDateStr.split('T')[0] : birthDateStr;
    const birthDate = new Date(cleanDateStr + 'T00:00:00');
    if (isNaN(birthDate.getTime())) return '0';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age < 0 ? '0' : String(age);
  };

  function parseCriancasIds(criancasIds: any): string[] {
    if (!criancasIds) return [];
    if (Array.isArray(criancasIds)) return criancasIds;
    if (typeof criancasIds === 'string') {
      try {
        return JSON.parse(criancasIds);
      } catch {
        return [criancasIds];
      }
    }
    return [];
  }

  useEffect(() => {
    if (!id) return;

    async function loadPublicChildData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // 1. Fetch child check-in from kids_sala_criancas
        const { data: childData, error: errChild } = await supabase
          .from('kids_sala_criancas')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (errChild || !childData) {
          setErrorMsg('Cadastro da criança não encontrado.');
          setLoading(false);
          return;
        }

        setChild(childData);

        // 2. Fetch parent members details if tipo_crianca === 'Membro'
        if (childData.tipo_crianca === 'Membro' && childData.id_membro) {
          const { data: memData } = await supabase
            .from('membros')
            .select('*')
            .eq('id', childData.id_membro)
            .maybeSingle();
          if (memData) {
            setMember(memData);
          }
        }

        // 3. Fetch Sala (room) details
        const { data: salaData } = await supabase
          .from('kids_salas')
          .select('*')
          .eq('id', childData.id_sala)
          .maybeSingle();

        if (salaData) {
          if (salaData.status === 'Fechado' || salaData.status === 'Encerrado') {
            setErrorMsg('Acesso indisponível. A sala correspondente a esta criança está fechada ou encerrada.');
            setLoading(false);
            return;
          }
          setSala(salaData);

          // Fetch Turma (class) details
          const { data: turmaData } = await supabase
            .from('kids_turmas')
            .select('*')
            .eq('id', salaData.id_turma)
            .maybeSingle();
          if (turmaData) {
            setTurma(turmaData);

            // Fetch Igreja details to style correctly
            if (turmaData.id_igreja) {
              const { data: chData } = await supabase
                .from('igrejas')
                .select('*')
                .eq('id', turmaData.id_igreja)
                .maybeSingle();
              if (chData) {
                setIgreja(chData);
              }
            }
          }

          // 4. Fetch Room schedule/programming from kids_programacao_sala
          const { data: progData } = await supabase
            .from('kids_programacao_sala')
            .select('*')
            .eq('id_sala', salaData.id)
            .order('data_hora', { ascending: true });
          if (progData) {
            setProgramacoes(progData);
          }

          // 5. Fetch communications from kids_comunicados
          const { data: comsData } = await supabase
            .from('kids_comunicados')
            .select('*')
            .eq('id_sala', salaData.id)
            .order('created_at', { ascending: false });

          if (comsData) {
            const unified: Comunicado[] = [];

            comsData.forEach((com: any) => {
              const targetIds = parseCriancasIds(com.criancas_ids);
              if (targetIds.includes('all') || targetIds.includes(childData.id)) {
                unified.push(com);
              }
            });

            setComunicados(unified);
          }
        }

      } catch (err) {
        console.error('Error loading public child profile:', err);
        setErrorMsg('Erro inesperado ao carregar dados públicos.');
      } finally {
        setLoading(false);
      }
    }

    loadPublicChildData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
        <RefreshCw className="animate-spin text-indigo-500 mb-4" size={32} />
        <p className="font-bold uppercase tracking-widest text-xs">Carregando perfil público infantil...</p>
      </div>
    );
  }

  if (errorMsg || !child) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-950 p-10 rounded-[2.5rem] shadow-xl text-center space-y-6 border border-slate-100 dark:border-slate-850">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase text-slate-900 dark:text-white">Perfil Indisponível</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-semibold">
              {errorMsg || 'Os dados solicitados não foram encontrados ou estão restritos.'}
            </p>
          </div>
          <button 
            onClick={() => router.push('/')}
            className="w-full bg-slate-900 dark:bg-slate-800 text-white font-black py-3.5 rounded-xl hover:opacity-90 transition-all uppercase text-xs tracking-widest cursor-pointer"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  // Fallback to custom/uploaded child photo or member photo or default placeholder
  const displayNome = child.tipo_crianca === 'Membro' 
    ? (member?.nome || 'Criança') 
    : (child.nome_visitante || 'Criança Visitante');

  const displayPhoto = child.foto_url || member?.foto_url || '';

  // Determine alert flags
  const hasAlerts = child.necessidades_especiais || child.restricoes_alimentares || child.observacoes_medicas;

  // Custom styling colors from church settings
  const corFundo = igreja?.cor_fundo;
  const corPaineis = igreja?.cor_paineis;
  const corBordas = igreja?.cor_bordas;
  const corFontes = igreja?.cor_fontes;
  const corBotoes = igreja?.cor_botoes;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --child-bg: ${corFundo || '#f8fafc'};
          --child-panel: ${corPaineis || '#ffffff'};
          --child-border: ${corBordas || '#e2e8f0'};
          --child-font: ${corFontes || '#0f172a'};
          --child-button: ${corBotoes || '#4f46e5'};
        }
        
        .child-page-wrapper {
          background-color: var(--child-bg) !important;
          color: var(--child-font) !important;
        }

        .child-panel {
          background-color: var(--child-panel) !important;
          border-color: var(--child-border) !important;
        }

        .child-btn-primary {
          background-color: var(--child-button) !important;
          color: #ffffff !important;
        }
      `}} />

      <div className="child-page-wrapper min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Header Block */}
          <header className="child-panel border rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
            <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
              {igreja?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={igreja.logo_url} 
                  alt={igreja.nome} 
                  className="w-14 h-14 object-contain rounded-2xl bg-white p-1 border border-slate-150"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-sans font-black text-xl flex items-center justify-center rounded-2xl shadow-md uppercase">
                  {igreja?.nome?.substring(0, 2) || 'KD'}
                </div>
              )}
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight">{igreja?.nome || 'Módulo Kids'}</h1>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5 justify-center md:justify-start">
                  <Star size={12} className="text-indigo-500 fill-indigo-500" /> Acompanhamento Kids Público
                </p>
              </div>
            </div>
            
            <div className="text-center md:text-right">
              <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl">
                🧒 {displayNome.split(' ')[0]} • Ativo
              </span>
            </div>
          </header>

          {/* Core Info & Alerts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Avatar, Personal Info, Parents/Responsubles */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Profile Card */}
              <div className="child-panel border rounded-[2.5rem] p-8 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full pointer-events-none" />
                
                {/* Photo Display */}
                <div className="relative mb-5">
                  {displayPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={displayPhoto} 
                      alt={displayNome} 
                      className="w-32 h-32 rounded-[2rem] object-cover border-4 border-white dark:border-slate-800 shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-[2rem] bg-indigo-100 dark:bg-indigo-950/40 border-4 border-white dark:border-slate-800 shadow-lg text-indigo-500 flex items-center justify-center">
                      <User size={54} className="opacity-80" />
                    </div>
                  )}
                  <span className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-2xl shadow-md">
                    <Sparkles size={16} />
                  </span>
                </div>

                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">
                  {displayNome}
                </h2>

                <div className="flex flex-wrap justify-center gap-2 mt-3.5">
                  <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide">
                    {child.tipo_crianca}
                  </span>
                  <span className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide">
                    {getAgeFromBirthDate(child.data_nascimento)} anos
                  </span>
                  {child.sexo && (
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide">
                      {child.sexo === 'Masculino' ? '♂ Menino' : '♀ Menina'}
                    </span>
                  )}
                </div>

                {/* Class / Room Associations */}
                <div className="w-full mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-4 text-left">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-150/55 dark:border-slate-850/55">
                    <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Turma / Grupo</p>
                    <p className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 mt-1 truncate">
                      {turma?.nome || 'Não definida'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-150/55 dark:border-slate-850/55">
                    <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Sala de Aula</p>
                    <p className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 mt-1 truncate">
                      {sala?.nome || 'Não definida'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Responsible / Parent Contact */}
              <div className="child-panel border rounded-[2.5rem] p-8 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                  <UserCheck size={18} className="text-indigo-500" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Responsável Legal</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Nome do Responsável</p>
                    <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                      <User size={14} className="text-slate-400" />
                      {child.nome_responsavel || 'Não cadastrado'}
                    </p>
                  </div>

                  {child.telefone_responsavel && (
                    <div className="pt-2">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Telefone de Contato</p>
                      <a 
                        href={`tel:${child.telefone_responsavel}`}
                        className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline mt-1 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 p-2 px-3.5 rounded-xl transition-all"
                      >
                        <Phone size={14} />
                        {child.telefone_responsavel}
                      </a>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Alerts and Schedule/Programming */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* ALERTS SECTION */}
              {hasAlerts ? (
                <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/30 dark:border-rose-500/20 rounded-[2.5rem] p-8 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <ShieldAlert size={20} className="animate-pulse shrink-0" />
                    <h3 className="text-sm font-black uppercase tracking-wider">🚨 Informações Importantes & Alertas</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {child.restricoes_alimentares && (
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-rose-500/20 shadow-inner">
                        <p className="text-[10px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1">
                          <Heart size={12} /> Restrições Alimentares
                        </p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1.5 whitespace-pre-wrap leading-relaxed">
                          {child.restricoes_alimentares}
                        </p>
                      </div>
                    )}

                    {child.necessidades_especiais && (
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-rose-500/20 shadow-inner">
                        <p className="text-[10px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1">
                          <Info size={12} /> Necessidades Especiais
                        </p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1.5 whitespace-pre-wrap leading-relaxed">
                          {child.necessidades_especiais}
                        </p>
                      </div>
                    )}

                    {child.observacoes_medicas && (
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-rose-500/20 shadow-inner md:col-span-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1">
                          <ShieldAlert size={12} /> Observações Médicas
                        </p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1.5 whitespace-pre-wrap leading-relaxed">
                          {child.observacoes_medicas}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="child-panel border rounded-[2.5rem] p-6 shadow-sm flex items-center gap-4 bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/25">
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                    <Heart size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400">Nenhum Alerta Ativo</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Nenhuma alergia, restrição alimentar ou necessidade médica cadastrada.</p>
                  </div>
                </div>
              )}

              {/* SCHEDULE / PROGRAMMING SECTION */}
              <div className="child-panel border rounded-[2.5rem] p-8 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-indigo-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest">Atividades & Programação</h3>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-md">
                    Sala Ativa
                  </span>
                </div>

                {programacoes.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                    <Clock size={28} className="text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Nenhuma atividade agendada</p>
                    <p className="text-[10px] text-slate-400">A programação do dia para esta sala estará disponível em breve.</p>
                  </div>
                ) : (
                  <div className="relative border-l border-indigo-500/20 pl-4 ml-2 space-y-6">
                    {programacoes.map((item, index) => {
                      const dateObj = new Date(item.data_hora);
                      const formattedTime = dateObj.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div key={item.id} className="relative group">
                          {/* Timeline bullet dot */}
                          <div className="absolute -left-[21px] top-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 transition-all group-hover:scale-110" />
                          
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                              <Clock size={10} /> {formattedTime}
                            </span>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                              {item.descricao}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Communications Block: Unified */}
          <div className="child-panel border rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-indigo-500" />
                <h3 className="text-xs font-black uppercase tracking-widest">📢 Comunicados & Avisos</h3>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 px-2.5 py-1 rounded-md">
                {comunicados.length}
              </span>
            </div>

            {comunicados.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <Megaphone size={28} className="text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Nenhum comunicado disponível</p>
                <p className="text-[10px] text-slate-400">Nenhum comunicado registrado para esta sala ou para a criança hoje.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {comunicados.map((comunicado) => {
                  const dateObj = new Date(comunicado.created_at);
                  const formattedDate = dateObj.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  // Parse arquivos
                  let files: {name: string, url: string}[] = [];
                  try {
                    files = typeof comunicado.arquivos === 'string'
                      ? JSON.parse(comunicado.arquivos)
                      : (comunicado.arquivos || []);
                  } catch (e) {
                    files = comunicado.arquivos || [];
                  }

                  const isAll = parseCriancasIds(comunicado.criancas_ids).includes('all');

                  return (
                    <div key={comunicado.id} className="p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-150/40 dark:border-slate-850/60 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex gap-2">
                          <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full border ${
                            isAll 
                              ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' 
                              : 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                          }`}>
                            {isAll ? 'Aviso Geral' : 'Aviso Individual'}
                          </span>
                          <span className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                            {comunicado.tipo || 'Observação'}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold">{formattedDate}</span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-semibold whitespace-pre-line">
                        {comunicado.descricao}
                      </p>

                      {/* Attachments & Thumbnail Previews */}
                      {files.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-1.5">
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Anexos:</p>
                          <div className="flex flex-wrap gap-3">
                            {files.map((file, fIdx) => {
                              const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name) || file.url.toLowerCase().includes('.jpg') || file.url.toLowerCase().includes('.png') || file.url.toLowerCase().includes('.jpeg') || file.url.toLowerCase().includes('.webp');
                              
                              if (isImage) {
                                return (
                                  <div key={fIdx} className="flex flex-col gap-1 items-start">
                                    <a
                                      key={fIdx}
                                      href={file.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:scale-105 transition-all group shrink-0"
                                      title={file.name}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={file.url}
                                        alt={file.name}
                                        className="h-20 w-20 object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    </a>
                                    <span className="text-[9px] text-slate-400 max-w-[80px] truncate">{file.name}</span>
                                  </div>
                                );
                              }

                              return (
                                <a 
                                  key={fIdx}
                                  href={file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl h-20"
                                >
                                  <FileText size={12} />
                                  <span className="truncate max-w-[120px]">{file.name}</span>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer watermark */}
          <footer className="text-center pt-4 pb-8">
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-widest">
              Acompanhamento Kids &copy; {new Date().getFullYear()}
            </p>
          </footer>

        </div>
      </div>
    </>
  );
}
