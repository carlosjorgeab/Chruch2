'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useIgreja } from '@/context/IgrejaContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useAuth } from '@/context/AuthContext';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Search, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  RefreshCw,
  MapPin,
  Lock,
  Globe,
  ClipboardCheck,
  LayoutGrid,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type AgendaItem = {
  id: string;
  id_igreja: string;
  titulo: string;
  data_hora: string;          // Data e Hora Inicial
  data_hora_fim?: string | null;  // Data e Hora Final
  dia_inteiro?: boolean;       // Checkbox do Dia Inteiro
  local?: string | null;       // Texto livre
  privado?: boolean;           // Público (false) ou Privado (true)
  status: 'Importante' | 'Normal' | 'Alerta';
  id_comunidade?: string | null;
  tempo_lembrete?: number | null;
  created_at?: string;
  criado_por_nome?: string | null;
  criado_em?: string | null;
  atualizado_por_nome?: string | null;
  atualizado_em?: string | null;
};

export default function AgendaPage() {
  const { selectedIgreja } = useIgreja();
  const { confirmDelete } = useConfirm();
  const { user } = useAuth();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'lista'>('grid');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Normal' | 'Importante' | 'Alerta'>('Todos');
  const [timeFilter, setTimeFilter] = useState<'futuros' | 'passados' | 'todos'>('futuros');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [titulo, setTitulo] = useState('');
  const [tempoLembrete, setTempoLembrete] = useState<number>(15);
  const [comunidades, setComunidades] = useState<any[]>([]);
  const [selectedComunidadeId, setSelectedComunidadeId] = useState<string>('');

  // Global default reminder setting
  const [defaultTempoLembreteGlobal, setDefaultTempoLembreteGlobal] = useState<number>(15);
  const [savingGlobalLembrete, setSavingGlobalLembrete] = useState(false);

  const fetchGlobalLembrete = async () => {
    if (!selectedIgreja?.id) return;
    try {
      const key = `tempo_lembrete_${selectedIgreja.id}`;
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', key)
        .maybeSingle();
      
      if (data && data.valor) {
        setDefaultTempoLembreteGlobal(parseInt(data.valor, 10) || 15);
      } else {
        const { data: globalData } = await supabase
          .from('configuracoes_sistema')
          .select('valor')
          .eq('chave', 'tempo_lembrete')
          .maybeSingle();
        if (globalData && globalData.valor) {
          setDefaultTempoLembreteGlobal(parseInt(globalData.valor, 10) || 15);
        }
      }
    } catch (err) {
      console.error('Error fetching global lembrete:', err);
    }
  };

  const saveGlobalLembreteSetting = async (val: number) => {
    if (!selectedIgreja?.id) return;
    setSavingGlobalLembrete(true);
    try {
      const key = `tempo_lembrete_${selectedIgreja.id}`;
      const { error } = await supabase
        .from('configuracoes_sistema')
        .upsert({
          chave: key,
          valor: String(val),
          descricao: `Tempo padrão de lembrete em minutos antes do início do compromisso para a igreja ${selectedIgreja.nome}`
        }, { onConflict: 'chave' });
      if (error) throw error;
      setDefaultTempoLembreteGlobal(val);
      localStorage.setItem(key, String(val));
      if (!editingId) {
        setTempoLembrete(val);
      }
    } catch (err) {
      console.error('Error saving global lembrete:', err);
    } finally {
      setSavingGlobalLembrete(false);
    }
  };

  // Presence checklist state
  const [showPresenceModal, setShowPresenceModal] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState<AgendaItem | null>(null);
  const [currentPresenceMeeting, setCurrentPresenceMeeting] = useState<AgendaItem | null>(null);
  const [presenceList, setPresenceList] = useState<Array<{ id_membro: string, nome: string, presente: boolean }>>([]);
  const [loadingPresence, setLoadingPresence] = useState(false);
  const [savingPresence, setSavingPresence] = useState(false);
  const [errorPresence, setErrorPresence] = useState('');
  const [successPresence, setSuccessPresence] = useState('');
  const [status, setStatus] = useState<'Importante' | 'Normal' | 'Alerta'>('Normal');
  const [privado, setPrivado] = useState<boolean>(false);
  const [diaInteiro, setDiaInteiro] = useState<boolean>(false);
  const [local, setLocal] = useState<string>('');
  const [recorrencia, setRecorrencia] = useState<'Único' | 'Diário' | 'Semanal' | 'Quinzenal' | 'Mensal' | 'Anual'>('Único');
  
  // Start date/time
  const [evtDate, setEvtDate] = useState('');
  const [evtTime, setEvtTime] = useState('');
  
  // End date/time
  const [evtDateEnd, setEvtDateEnd] = useState('');
  const [evtTimeEnd, setEvtTimeEnd] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedIgreja?.id) {
      fetchAgenda();
      fetchComunidades();
      fetchGlobalLembrete();
    }
  }, [selectedIgreja]);

  const fetchComunidades = async () => {
    if (!selectedIgreja?.id) return;
    try {
      const { data, error: comErr } = await supabase
        .from('comunidades')
        .select('id, nome')
        .eq('id_igreja', selectedIgreja.id)
        .order('nome', { ascending: true });
      if (comErr) throw comErr;
      setComunidades(data || []);
    } catch (e) {
      console.error('Error fetching communities for agenda:', e);
    }
  };

  const openPresenceModal = async (item: AgendaItem) => {
    if (!item.id_comunidade) return;
    setCurrentPresenceMeeting(item);
    setLoadingPresence(true);
    setErrorPresence('');
    setSuccessPresence('');
    setPresenceList([]);
    
    try {
      // 1. Fetch community members
      const { data: membersData, error: membErr } = await supabase
        .from('membros_comunidade')
        .select(`
          id_membro,
          membros:membros!id_membro(nome)
        `)
        .eq('id_comunidade', item.id_comunidade);

      if (membErr) throw membErr;

      // 2. Fetch existing presence records
      const { data: presenceData, error: presErr } = await supabase
        .from('chamada_reuniao')
        .select('*')
        .eq('id_agenda', item.id);

      if (presErr) throw presErr;

      // 3. Match them up
      const formattedList = (membersData || []).map((m: any) => {
        const existing = (presenceData || []).find((p: any) => p.id_membro === m.id_membro);
        return {
          id_membro: m.id_membro,
          nome: m.membros?.nome || 'Membro desconhecido',
          presente: existing ? !!existing.presente : true
        };
      });

      setPresenceList(formattedList);
      setShowPresenceModal(true);
    } catch (e: any) {
      console.error('Error loading presence:', e);
      setErrorPresence('Erro ao carregar lista de presença: ' + e.message);
    } finally {
      setLoadingPresence(false);
    }
  };

  const savePresence = async () => {
    if (!currentPresenceMeeting) return;
    setSavingPresence(true);
    setErrorPresence('');
    setSuccessPresence('');
    
    try {
      if (presenceList.length > 0) {
        const upserts = presenceList.map(item => ({
          id_agenda: currentPresenceMeeting.id,
          id_membro: item.id_membro,
          presente: item.presente
        }));

        const { error: upsertErr } = await supabase
          .from('chamada_reuniao')
          .upsert(upserts, { onConflict: 'id_agenda,id_membro' });

        if (upsertErr) throw upsertErr;
      }

      setSuccessPresence('Lista de chamada salva com sucesso!');
      setTimeout(() => {
        setShowPresenceModal(false);
      }, 1000);
    } catch (e: any) {
      console.error('Error saving presence:', e);
      setErrorPresence('Erro ao salvar chamada: ' + e.message);
    } finally {
      setSavingPresence(false);
    }
  };

  const fetchAgenda = async () => {
    if (!selectedIgreja?.id) return;
    try {
      setLoading(true);
      setError('');
      
      const { data, error: fetchErr } = await supabase
        .from('agendas')
        .select(`
          *,
          reunioes (
            id_comunidade
          )
        `)
        .eq('id_igreja', selectedIgreja.id)
        .order('data_hora', { ascending: true });

      if (fetchErr) throw fetchErr;

      const mapped = (data || []).map((item: any) => ({
        ...item,
        id_comunidade: item.reunioes ? (Array.isArray(item.reunioes) ? item.reunioes[0]?.id_comunidade : item.reunioes?.id_comunidade) : null
      }));

      setItems(mapped);
    } catch (err: any) {
      console.error('Error fetching agenda:', err);
      setError('Erro ao carregar a agenda da igreja: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const initForm = (item?: AgendaItem) => {
    setError('');
    setSuccess('');
    
    if (item) {
      setEditingId(item.id);
      setTitulo(item.titulo);
      setStatus(item.status);
      setPrivado(!!item.privado);
      setDiaInteiro(!!item.dia_inteiro);
      setLocal(item.local || '');
      setRecorrencia('Único');
      setSelectedComunidadeId(item.id_comunidade || '');
      setTempoLembrete(item.tempo_lembrete !== undefined && item.tempo_lembrete !== null ? item.tempo_lembrete : 15);

      // Parse Initial Date & Time
      const dtStart = new Date(item.data_hora);
      const startYear = dtStart.getFullYear();
      const startMonth = String(dtStart.getMonth() + 1).padStart(2, '0');
      const startDay = String(dtStart.getDate()).padStart(2, '0');
      setEvtDate(`${startYear}-${startMonth}-${startDay}`);
      
      const startHours = String(dtStart.getHours()).padStart(2, '0');
      const startMinutes = String(dtStart.getMinutes()).padStart(2, '0');
      setEvtTime(`${startHours}:${startMinutes}`);

      // Parse Final Date & Time
      if (item.data_hora_fim) {
        const dtEnd = new Date(item.data_hora_fim);
        const endYear = dtEnd.getFullYear();
        const endMonth = String(dtEnd.getMonth() + 1).padStart(2, '0');
        const endDay = String(dtEnd.getDate()).padStart(2, '0');
        setEvtDateEnd(`${endYear}-${endMonth}-${endDay}`);

        const endHours = String(dtEnd.getHours()).padStart(2, '0');
        const endMinutes = String(dtEnd.getMinutes()).padStart(2, '0');
        setEvtTimeEnd(`${endHours}:${endMinutes}`);
      } else {
        // Fallback or default
        setEvtDateEnd(`${startYear}-${startMonth}-${startDay}`);
        setEvtTimeEnd('21:30');
      }
      
      setIsEditing(true);
    } else {
      setEditingId(null);
      setTitulo('');
      setStatus('Normal');
      setPrivado(false);
      setDiaInteiro(false);
      setLocal('');
      setRecorrencia('Único');
      setSelectedComunidadeId('');
      
      setTempoLembrete(defaultTempoLembreteGlobal);
      
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      setEvtDate(todayString);
      setEvtTime('19:30');
      
      setEvtDateEnd(todayString);
      setEvtTimeEnd('21:30');
      
      setIsEditing(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIgreja?.id) {
      setError('Selecione uma igreja ativa.');
      return;
    }

    if (!titulo.trim()) {
      setError('O nome do evento é obrigatório.');
      return;
    }

    if (!evtDate || !evtTime) {
      setError('A data e o horário inicial são obrigatórios.');
      return;
    }

    if (!diaInteiro && (!evtDateEnd || !evtTimeEnd)) {
      setError('A data e o horário final são obrigatórios quando não for Dia Inteiro.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      // Create timezone-safe ISO string from Date part and Time part
      const startDateTimeString = `${evtDate}T${evtTime}:00`;
      const finalIsoStart = new Date(startDateTimeString).toISOString();

      let finalIsoEnd = null;
      if (diaInteiro) {
        const endDateTimeString = `${evtDate}T23:59:59`;
        finalIsoEnd = new Date(endDateTimeString).toISOString();
      } else {
        const endDateTimeString = `${evtDateEnd}T${evtTimeEnd}:00`;
        finalIsoEnd = new Date(endDateTimeString).toISOString();
        
        // Assert start is before/equal to end
        if (new Date(finalIsoStart) > new Date(finalIsoEnd)) {
          setError('A data e hora inicial não podem ser posteriores à data e hora final.');
          setSubmitting(false);
          return;
        }
      }

      if (editingId) {
        // Update
        const payload = {
          id_igreja: selectedIgreja.id,
          titulo: titulo.trim(),
          data_hora: finalIsoStart,
          data_hora_fim: finalIsoEnd,
          dia_inteiro: diaInteiro,
          local: local.trim() || null,
          privado: privado,
          status: status,
          tempo_lembrete: tempoLembrete,
          atualizado_por_nome: user?.nome || user?.email || 'Membro',
          atualizado_em: new Date().toISOString()
        };

        const { error: patchErr } = await supabase
          .from('agendas')
          .update(payload)
          .eq('id', editingId);

        if (patchErr) throw patchErr;

        if (selectedComunidadeId) {
          const { error: reunioesErr } = await supabase
            .from('reunioes')
            .upsert({
              id_agenda: editingId,
              id_comunidade: selectedComunidadeId
            }, { onConflict: 'id_agenda' });

          if (reunioesErr) {
            console.error('Error exporting to reunioes (update):', reunioesErr);
          }
        } else {
          // If community link removed, clear from reunioes
          const { error: delReunioesErr } = await supabase
            .from('reunioes')
            .delete()
            .eq('id_agenda', editingId);

          if (delReunioesErr) {
            console.error('Error deleting from reunioes (update):', delReunioesErr);
          }
        }

        setSuccess('Evento atualizado com sucesso!');
      } else {
        // Generate payloads for single or recurring events
        const payloadsToInsert = [];
        let currentStartDate = new Date(finalIsoStart);
        let durationMs = 0;
        if (finalIsoEnd) {
          durationMs = new Date(finalIsoEnd).getTime() - new Date(finalIsoStart).getTime();
        }

        const limitDate = new Date(`${evtDateEnd}T23:59:59`);

        if (recorrencia === 'Único') {
          payloadsToInsert.push({
            id_igreja: selectedIgreja.id,
            titulo: titulo.trim(),
            data_hora: finalIsoStart,
            data_hora_fim: finalIsoEnd,
            dia_inteiro: diaInteiro,
            local: local.trim() || null,
            privado: privado,
            status: status,
            tempo_lembrete: tempoLembrete,
            criado_por_nome: user?.nome || user?.email || 'Membro',
            criado_em: new Date().toISOString()
          });
        } else {
          while (currentStartDate <= limitDate) {
            const currentEndDate = finalIsoEnd ? new Date(currentStartDate.getTime() + durationMs) : null;
            
            payloadsToInsert.push({
              id_igreja: selectedIgreja.id,
              titulo: titulo.trim(),
              data_hora: currentStartDate.toISOString(),
              data_hora_fim: currentEndDate ? currentEndDate.toISOString() : null,
              dia_inteiro: diaInteiro,
              local: local.trim() || null,
              privado: privado,
              status: status,
              tempo_lembrete: tempoLembrete,
              criado_por_nome: user?.nome || user?.email || 'Membro',
              criado_em: new Date().toISOString()
            });

            if (recorrencia === 'Diário') {
              currentStartDate.setDate(currentStartDate.getDate() + 1);
            } else if (recorrencia === 'Semanal') {
              currentStartDate.setDate(currentStartDate.getDate() + 7);
            } else if (recorrencia === 'Quinzenal') {
              currentStartDate.setDate(currentStartDate.getDate() + 15);
            } else if (recorrencia === 'Mensal') {
              currentStartDate.setMonth(currentStartDate.getMonth() + 1);
            } else if (recorrencia === 'Anual') {
              currentStartDate.setFullYear(currentStartDate.getFullYear() + 1);
            }
          }
        }

        const { data: insertedData, error: postErr } = await supabase
          .from('agendas')
          .insert(payloadsToInsert)
          .select('id');

        if (postErr) throw postErr;

        // Export to reunioes if id_comunidade is selected
        if (selectedComunidadeId && insertedData && insertedData.length > 0) {
          const reunioesPayload = insertedData.map((item: any) => ({
            id_agenda: item.id,
            id_comunidade: selectedComunidadeId
          }));

          const { error: reunioesErr } = await supabase
            .from('reunioes')
            .upsert(reunioesPayload, { onConflict: 'id_agenda' });

          if (reunioesErr) {
            console.error('Error exporting to reunioes:', reunioesErr);
          }
        }

        setSuccess(`Novo evento cadastrado com sucesso! (${payloadsToInsert.length} eventos agendados no período)`);
      }

      setIsEditing(false);
      fetchAgenda();
    } catch (err: any) {
      console.error('Error saving agenda item:', err);
      setError('Erro ao salvar item na agenda: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    confirmDelete({
      title: 'Excluir Evento da Agenda',
      message: `Tem certeza que deseja excluir o evento "${name}" permanentemente?`,
      onConfirm: async () => {
        try {
          const { error: delErr } = await supabase
            .from('agendas')
            .delete()
            .eq('id', id);

          if (delErr) throw delErr;
          setSuccess('Evento excluído do cronograma!');
          fetchAgenda();
        } catch (err: any) {
          console.error('Error deleting agenda item:', err);
          setError('Erro ao excluir evento: ' + err.message);
        }
      }
    });
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.titulo.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || item.status === statusFilter;
    
    // Time filter logic
    const now = new Date();
    const eventEndDateStr = item.data_hora_fim || item.data_hora;
    const eventEndDate = new Date(eventEndDateStr);
    
    let matchesTime = true;
    if (timeFilter === 'futuros') {
      matchesTime = eventEndDate >= now || eventEndDate.toDateString() === now.toDateString();
    } else if (timeFilter === 'passados') {
      matchesTime = eventEndDate < now && eventEndDate.toDateString() !== now.toDateString();
    }
    
    return matchesSearch && matchesStatus && matchesTime;
  });

  const getStatusStyle = (st: 'Importante' | 'Normal' | 'Alerta') => {
    switch(st) {
      case 'Importante':
        return {
          wrapper: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-900 dark:text-red-300',
          badge: 'bg-red-600 text-white',
          dot: 'bg-red-600',
          border: 'border-red-500/20 dark:border-red-500/10'
        };
      case 'Alerta':
        return {
          wrapper: 'bg-amber-50 dark:bg-amber-950/20 border-amber-250 dark:border-amber-900/30 text-amber-900 dark:text-amber-300',
          badge: 'bg-amber-500 text-slate-900 font-bold',
          dot: 'bg-[#E4A232]',
          border: 'border-amber-500/20 dark:border-amber-500/10'
        };
      case 'Normal':
      default:
        return {
          wrapper: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30 text-blue-900 dark:text-blue-300',
          badge: 'bg-blue-600 text-white',
          dot: 'bg-blue-600',
          border: 'border-blue-500/20 dark:border-blue-500/10'
        };
    }
  };

  const formatEventDateRange = (startIso: string, endIso?: string | null, isAllDay?: boolean) => {
    const start = new Date(startIso);
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: 'short' };
    const dateStr = start.toLocaleDateString('pt-BR', options);
    
    if (endIso && !isAllDay) {
      const end = new Date(endIso);
      if (start.toDateString() !== end.toDateString()) {
        const endDateStr = end.toLocaleDateString('pt-BR', options);
        return `${dateStr} até ${endDateStr}`;
      }
    }
    return start.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatEventTimeRange = (startIso: string, endIso?: string | null, isAllDay?: boolean) => {
    if (isAllDay) return 'Dia Inteiro';
    const start = new Date(startIso);
    const startStr = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (endIso) {
      const end = new Date(endIso);
      const endStr = end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `${startStr} às ${endStr} Horas`;
    }
    return `${startStr} Horas`;
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-6 lg:px-8 transition-colors duration-300 font-['Inter']">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header section with ambient design card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/65 dark:border-slate-800/80 shadow-md p-6 sm:p-10 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-amber-500/10 dark:bg-amber-500/5 blur-3xl -z-10 pointer-events-none" />
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#E4A232] text-white rounded-2xl shadow-lg">
                <Calendar size={28} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3.5xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">
                  Agenda da Igreja
                </h1>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-450 dark:text-slate-400 mt-1 uppercase tracking-widest leading-none">
                  Gestão de Cronogramas, Cultos e Eventos
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchAgenda}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl font-bold text-xs tracking-wider uppercase transition flex items-center gap-2 cursor-pointer border border-slate-200/50 dark:border-slate-700/50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
            <button
              onClick={() => initForm()}
              className="px-5 py-3 bg-[#E4A232] hover:bg-[#E4A232]/90 text-white rounded-xl font-black text-xs tracking-wider uppercase shadow-xl shadow-amber-500/20 active:scale-95 duration-200 transition flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              Novo Evento
            </button>
          </div>
        </div>

        {/* Global Error/Success alert feedback */}
        {error && (
          <div className="p-4 bg-red-55/15 border border-red-500/20 text-red-700 dark:text-red-400 rounded-2xl flex items-center gap-3 text-xs font-semibold animate-in fade-in duration-200">
            <AlertTriangle size={18} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-55/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-2xl flex items-center gap-3 text-xs font-semibold animate-in fade-in duration-200">
            <CheckCircle size={18} className="shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {/* Agenda Scheduling & Editing drawer modal dialog */}
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-10 w-full max-w-lg my-8 relative animate-in zoom-in-95 duration-250 max-h-[90vh] overflow-y-auto scrollbar-thin">
              <button
                onClick={() => setIsEditing(false)}
                className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 cursor-pointer transition"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
                <Calendar className="text-[#E4A232]" size={24} />
                <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  {editingId ? 'Editar Evento' : 'Agendar Novo Evento'}
                </h2>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                
                {/* e) Definir Público / Privado no inicio do Cadastro */}
                <div>
                  <label className="block text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    Visibilidade do Evento
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850">
                    <button
                      type="button"
                      onClick={() => setPrivado(false)}
                      className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                        !privado
                          ? 'bg-[#E4A232] text-white shadow-md'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-405 dark:hover:text-slate-200'
                      }`}
                    >
                      <Globe size={14} />
                      🌍 Público
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrivado(true)}
                      className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                        privado
                          ? 'bg-[#E4A232] text-white shadow-md'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-405 dark:hover:text-slate-200'
                      }`}
                    >
                      <Lock size={14} />
                      🔒 Privado
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    Nome do Evento
                  </label>
                  <input
                    type="text"
                    required
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Culto de Jovens, Reunião de Líderes"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 dark:focus:border-amber-500 outline-none font-semibold transition"
                  />
                </div>

                {/* d) Campo de Local (texto livre) */}
                <div>
                  <label className="block text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    📍 Local / Endereço (Texto Livre)
                  </label>
                  <input
                    type="text"
                    value={local}
                    onChange={(e) => setLocal(e.target.value)}
                    placeholder="Ex: Templo Principal, Área Externa, Online via Zoom"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 dark:focus:border-amber-500 outline-none font-semibold transition"
                  />
                </div>

                {/* c) Checkbox Dia Inteiro */}
                <div className="flex items-center gap-2 px-1 py-1 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 rounded-xl">
                  <input
                    type="checkbox"
                    id="dia_inteiro_form"
                    checked={diaInteiro}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setDiaInteiro(checked);
                      if (checked) {
                        setEvtDateEnd(evtDate);
                        setEvtTimeEnd('23:59');
                      }
                    }}
                    className="w-4 h-4 text-[#E4A232] border-slate-300 rounded focus:ring-amber-500 cursor-pointer accent-amber-500"
                  />
                  <label 
                    htmlFor="dia_inteiro_form" 
                    className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide cursor-pointer select-none"
                  >
                    ⏰ Evento do Dia Inteiro
                  </label>
                </div>

                {/* a) Alterar Data da Agenda para Data Inicial e Horario para Horario Inicial */}
                <fieldset className="p-4 border-2 border-slate-100 dark:border-slate-850 rounded-2xl space-y-4">
                  <legend className="px-2 text-[10px] font-black text-amber-550 uppercase tracking-widest">
                    Início do Evento
                  </legend>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1">
                        Data Inicial
                      </label>
                      <input
                        type="date"
                        required
                        value={evtDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEvtDate(val);
                          if (diaInteiro) {
                            setEvtDateEnd(val);
                          }
                        }}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-semibold transition text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1">
                        Horário Inicial
                      </label>
                      <input
                        type="time"
                        required
                        value={evtTime}
                        onChange={(e) => setEvtTime(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-semibold transition text-xs"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* b) Criar uma Nova Data, Data Final e Horário Final da Agenda (desabilitados se dia inteiro) */}
                <fieldset className={`p-4 border-2 border-slate-100 dark:border-slate-850 rounded-2xl space-y-4 transition ${diaInteiro ? 'opacity-40 pointer-events-none' : ''}`}>
                  <legend className="px-2 text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                    Fim do Evento {!diaInteiro ? '' : '(Bloqueado por Dia Inteiro)'}
                  </legend>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1">
                        Data Final
                      </label>
                      <input
                        type="date"
                        required={!diaInteiro}
                        disabled={diaInteiro}
                        value={diaInteiro ? evtDate : evtDateEnd}
                        onChange={(e) => setEvtDateEnd(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-semibold transition text-xs disabled:bg-slate-100 dark:disabled:bg-slate-900/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1">
                        Horário Final
                      </label>
                      <input
                        type="time"
                        required={!diaInteiro}
                        disabled={diaInteiro}
                        value={diaInteiro ? '23:59' : evtTimeEnd}
                        onChange={(e) => setEvtTimeEnd(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-semibold transition text-xs disabled:bg-slate-100 dark:disabled:bg-slate-900/50"
                      />
                    </div>
                  </div>
                </fieldset>

                <div>
                  <label className="block text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    Status / Prioridade
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-semibold transition cursor-pointer text-xs"
                  >
                    <option value="Normal">Normal (Azul)</option>
                    <option value="Importante">Importante (Vermelho)</option>
                    <option value="Alerta">Alerta (Amarelo)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
                    Cada status possui cores informativas distintas na Agenda e Painéis de Controle.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    🔔 Antecedência do Lembrete (Minutos)
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="number"
                      min="0"
                      required
                      value={tempoLembrete}
                      onChange={(e) => setTempoLembrete(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-semibold transition text-xs"
                      placeholder="Ex: 15"
                    />
                    <span className="text-xs font-bold text-slate-450 uppercase tracking-wider shrink-0">minutos antes</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
                    Define o tempo de antecedência para enviar notificações aos membros cadastrados automaticamente antes do início do compromisso.
                  </p>
                </div>

                {!editingId && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      🔁 Recorrência / Repetição de Agendas
                    </label>
                    <select
                      value={recorrencia}
                      onChange={(e) => setRecorrencia(e.target.value as any)}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-semibold transition cursor-pointer text-xs"
                    >
                      <option value="Único">Único (Sem repetição)</option>
                      <option value="Diário">Diário (Duplica todo dia até Data Final)</option>
                      <option value="Semanal">Semanal (Duplica toda semana até Data Final)</option>
                      <option value="Quinzenal">Quinzenal (Duplica a cada 15 dias até Data Final)</option>
                      <option value="Mensal">Mensal (Duplica todo mês até Data Final)</option>
                      <option value="Anual">Anual (Duplica todo ano até Data Final)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
                      Escolha um período se deseja criar uma série de agendas repetidas automaticamente da Data Inicial até a Data Final.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 rounded-xl bg-[#E4A232] hover:bg-[#E4A232]/90 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/10 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Save size={14} />
                    {submitting ? 'Salvando...' : 'Salvar Evento'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/85 p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Pesquisar evento pelo nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 outline-none text-xs font-semibold"
              />
            </div>

            {/* Global Reminder Configuration */}
            <div className="flex items-center gap-2 p-1 bg-slate-50 dark:bg-slate-955 rounded-xl border border-slate-200/50 dark:border-slate-800/80 shrink-0 self-start md:self-auto">
              <span className="text-[10px] font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider pl-2.5 flex items-center gap-1.5">
                🔔 Lembrete Padrão:
              </span>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-850">
                <input
                  type="number"
                  min="0"
                  value={defaultTempoLembreteGlobal}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 0;
                    saveGlobalLembreteSetting(val);
                  }}
                  disabled={savingGlobalLembrete}
                  className="w-11 text-center font-black text-xs bg-transparent text-slate-900 dark:text-white outline-none"
                />
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider pr-1">min</span>
              </div>
            </div>

            {/* Layout Toggle (Grid vs Lista) */}
            <div className="flex items-center gap-2 p-1 bg-slate-50 dark:bg-slate-955 rounded-xl border border-slate-200/50 dark:border-slate-800/80 shrink-0 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setLayoutMode('grid')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                  layoutMode === 'grid'
                    ? 'bg-[#E4A232] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
                title="Visualização em Grid"
              >
                <LayoutGrid size={14} />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('lista')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                  layoutMode === 'lista'
                    ? 'bg-[#E4A232] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
                title="Visualização em Lista"
              >
                <List size={14} />
                Lista
              </button>
            </div>
          </div>

          {/* Filters Row with Period and Priority */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-850">
            <div className="flex flex-wrap gap-x-6 gap-y-3 items-center">
              {/* Time Period Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Período:</span>
                <div className="flex items-center gap-1 p-0.5 bg-slate-50 dark:bg-slate-955 rounded-lg border border-slate-200/50 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setTimeFilter('futuros')}
                    className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
                      timeFilter === 'futuros'
                        ? 'bg-[#E4A232] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    🔮 Futuros
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFilter('passados')}
                    className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
                      timeFilter === 'passados'
                        ? 'bg-[#E4A232] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    ⏳ Passados
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFilter('todos')}
                    className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
                      timeFilter === 'todos'
                        ? 'bg-[#E4A232] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    📅 Todos
                  </button>
                </div>
              </div>

              {/* Status/Priority Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Prioridade:</span>
                <div className="flex flex-wrap gap-1">
                  {(['Todos', 'Normal', 'Importante', 'Alerta'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${
                        statusFilter === st
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      {st === 'Todos' ? 'Filtro Tudo' : st === 'Normal' ? '🔵 Normal' : st === 'Importante' ? '🔴 Importante' : '🟡 Alerta'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">
              Mostrando <span className="text-slate-700 dark:text-slate-300 font-black">{filteredItems.length}</span> de <span className="text-slate-700 dark:text-slate-300 font-black">{items.length}</span> eventos
            </div>
          </div>
        </div>

        {/* Agenda Events rendering area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-250/20">
            <RefreshCw className="animate-spin text-amber-500 mb-3" size={32} />
            <p className="text-sm font-semibold text-slate-450">Buscando cronograma e eventos da igreja...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-150 dark:border-slate-800 shadow-sm min-h-[300px]">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-[#E4A232] flex items-center justify-center mb-4">
              <Calendar size={32} />
            </div>
            <h3 className="text-base font-black uppercase text-slate-800 dark:text-white tracking-tight">Nenhum evento registrado</h3>
            <p className="text-xs text-slate-450 max-w-sm mt-1.5 font-medium leading-relaxed">
              Não há eventos ou programações cadastradas {search ? 'com esse nome' : 'para a igreja selecionada'}. Toque em "Novo Evento" para começar.
            </p>
          </div>
        ) : (
          <motion.div 
            layout 
            className={layoutMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}
          >
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, index) => {
                const styles = getStatusStyle(item.status);
                const hasReminder = item.tempo_lembrete !== undefined && item.tempo_lembrete !== null;
                const reminderClass = hasReminder ? 'agenda-event-card' : '';

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25, delay: index * 0.02 }}
                    className={layoutMode === 'grid' 
                      ? `bg-white dark:bg-slate-900 border ${styles.border} rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between items-start gap-4 h-full relative ${reminderClass}`
                      : `bg-white dark:bg-slate-900 border ${styles.border} rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative w-full ${reminderClass}`
                    }
                  >
                    {layoutMode === 'grid' ? (
                      <>
                        {item.status === 'Alerta' && (
                          <div className="absolute top-6 right-6">
                            <span className="flex h-3.5 w-3.5 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
                            </span>
                          </div>
                        )}

                        <div className="space-y-4 w-full">
                          {/* Priority Tag line & Visibility indicator */}
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${styles.wrapper}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                              {item.status}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${
                              item.privado 
                                ? 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400' 
                                : 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-400'
                            }`}>
                              <Lock size={9} />
                              {item.privado ? 'Privado' : 'Público'}
                            </span>
                          </div>

                          {/* Event Title */}
                          <h3 className="text-sm font-black uppercase tracking-tight text-slate-850 dark:text-white leading-snug line-clamp-2">
                            {item.titulo}
                          </h3>

                          {/* Date and Time block */}
                          <div className="space-y-2 border-t border-slate-100 dark:border-slate-850 pt-4 w-full">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-xs">
                              <Calendar size={14} className="text-[#E4A232] shrink-0" />
                              <span className="line-clamp-1">{formatEventDateRange(item.data_hora, item.data_hora_fim, item.dia_inteiro)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-xs">
                              <Clock size={14} className="text-[#E4A232] shrink-0" />
                              <span>{formatEventTimeRange(item.data_hora, item.data_hora_fim, item.dia_inteiro)}</span>
                            </div>
                            
                            {/* Render Local details */}
                            {item.local && (
                              <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400 font-bold text-xs pt-1">
                                <MapPin size={14} className="text-amber-550 shrink-0 mt-0.5" />
                                <span className="line-clamp-2 leading-tight">{item.local}</span>
                              </div>
                            )}

                            {/* Render Reminder details */}
                            {item.tempo_lembrete !== undefined && item.tempo_lembrete !== null && (
                              <div className="flex items-center gap-2 text-slate-450 dark:text-slate-500 font-bold text-[11px] pt-1 border-t border-dashed border-slate-100 dark:border-slate-800 w-full mt-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-[#E4A232] font-extrabold uppercase tracking-wide">
                                  🔔 Lembrete: {item.tempo_lembrete} min
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Controller actions */}
                        <div className="flex gap-2 w-full pt-4 border-t border-slate-100 dark:border-slate-850/80 mt-auto justify-end items-center">
                          <button
                            onClick={() => setSelectedEventDetails(item)}
                            className="p-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 text-[#E4A232] rounded-xl transition duration-200 hover:scale-[1.04] cursor-pointer"
                            title="Visualizar Detalhes e Auditoria"
                          >
                            <Info size={13} />
                          </button>
                          <button
                            onClick={() => initForm(item)}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 rounded-xl transition duration-200 hover:scale-[1.04] cursor-pointer"
                            title="Modificar Evento"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.titulo)}
                            className="p-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl transition duration-200 hover:scale-[1.04] cursor-pointer"
                            title="Excluir Evento"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start gap-4 flex-1 w-full sm:w-auto">
                          {/* Left status vertical strip or bar */}
                          <div className={`w-1.5 h-12 rounded-full ${styles.dot} self-stretch shrink-0`} />
                          
                          <div className="space-y-1 flex-1">
                            {/* Event Title */}
                            <h3 className="text-sm font-black uppercase tracking-tight text-slate-850 dark:text-white leading-snug">
                              {item.titulo}
                            </h3>
                            
                            {/* Quick dates & times */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar size={12} className="text-[#E4A232]" />
                                {formatEventDateRange(item.data_hora, item.data_hora_fim, item.dia_inteiro)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} className="text-[#E4A232]" />
                                {formatEventTimeRange(item.data_hora, item.data_hora_fim, item.dia_inteiro)}
                              </span>
                              {item.local && (
                                <span className="flex items-center gap-1">
                                  <MapPin size={12} className="text-amber-550" />
                                  {item.local}
                                </span>
                              )}
                              {item.tempo_lembrete !== undefined && item.tempo_lembrete !== null && (
                                <span className="flex items-center gap-1 text-[#E4A232] font-black">
                                  <span>🔔 {item.tempo_lembrete}m antes</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status badges & actions */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-850 justify-between sm:justify-end">
                          <div className="flex gap-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${styles.wrapper}`}>
                              {item.status}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${
                              item.privado 
                                ? 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400' 
                                : 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-400'
                            }`}>
                              {item.privado ? 'Privado' : 'Público'}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedEventDetails(item)}
                              className="p-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 text-[#E4A232] rounded-xl transition duration-200 hover:scale-[1.04] cursor-pointer"
                              title="Visualizar Detalhes e Auditoria"
                            >
                              <Info size={13} />
                            </button>
                            <button
                              onClick={() => initForm(item)}
                              className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 rounded-xl transition duration-200 hover:scale-[1.04] cursor-pointer"
                              title="Modificar Evento"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.titulo)}
                              className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl transition duration-200 hover:scale-[1.04] cursor-pointer"
                              title="Excluir Evento"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
        {/* Modal de Detalhes e Auditoria do Evento */}
        {selectedEventDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-850 shadow-2xl p-6 sm:p-8 w-full max-w-md relative animate-in zoom-in-95 duration-250">
              <button
                onClick={() => setSelectedEventDetails(null)}
                className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 cursor-pointer transition"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                <Info className="text-[#E4A232]" size={22} />
                <h2 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  Detalhes do Evento
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Nome do Compromisso</span>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-tight leading-tight mt-0.5">
                    {selectedEventDetails.titulo}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850">
                  <div>
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">📅 Data</span>
                    <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mt-0.5">
                      {new Date(selectedEventDetails.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">⏰ Horário</span>
                    <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mt-0.5">
                      {formatEventTimeRange(selectedEventDetails.data_hora, selectedEventDetails.data_hora_fim, selectedEventDetails.dia_inteiro)}
                    </p>
                  </div>
                </div>

                {selectedEventDetails.local && (
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">📍 Local</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                      {selectedEventDetails.local}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${
                    selectedEventDetails.privado 
                      ? 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400' 
                      : 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-400'
                  }`}>
                    {selectedEventDetails.privado ? '🔒 Privado' : '🌍 Público'}
                  </span>
                  
                  {selectedEventDetails.tempo_lembrete !== undefined && selectedEventDetails.tempo_lembrete !== null && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border bg-amber-500/10 border-amber-500/20 text-[#E4A232]">
                      🔔 Lembrete: {selectedEventDetails.tempo_lembrete} min
                    </span>
                  )}
                </div>

                {/* Audit Log Panel */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                    📝 Histórico de Auditoria
                  </h4>

                  <div className="space-y-3">
                    {/* Created log */}
                    <div className="flex gap-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                      <div>
                        <span className="font-extrabold text-slate-700 dark:text-slate-300 uppercase text-[9px] block">Criado por</span>
                        <p className="leading-relaxed">
                          <span className="text-slate-900 dark:text-white font-black">{selectedEventDetails.criado_por_nome || 'Sistema (Legado)'}</span> em{' '}
                          <span>{selectedEventDetails.criado_em ? new Date(selectedEventDetails.criado_em).toLocaleString('pt-BR') : new Date(selectedEventDetails.created_at || '').toLocaleString('pt-BR')}</span>
                        </p>
                      </div>
                    </div>

                    {/* Updated log (conditional) */}
                    {selectedEventDetails.atualizado_por_nome && (
                      <div className="flex gap-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-t border-dashed border-slate-100 dark:border-slate-800 pt-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                        <div>
                          <span className="font-extrabold text-slate-700 dark:text-slate-300 uppercase text-[9px] block">Última modificação</span>
                          <p className="leading-relaxed">
                            <span className="text-slate-900 dark:text-white font-black">{selectedEventDetails.atualizado_por_nome}</span> em{' '}
                            <span>{selectedEventDetails.atualizado_em ? new Date(selectedEventDetails.atualizado_em).toLocaleString('pt-BR') : ''}</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedEventDetails(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-black text-xs uppercase tracking-wide cursor-pointer transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
