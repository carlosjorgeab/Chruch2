'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useIgreja } from '@/context/IgrejaContext';
import { useConfirm } from '@/context/ConfirmContext';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Search, 
  Upload, 
  FileText, 
  RefreshCw, 
  Calendar, 
  DollarSign, 
  User, 
  Ticket, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  ExternalLink,
  ChevronRight,
  ClipboardList,
  CheckSquare,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';

// Type definitions matching DB and requested features
type Evento = {
  id: string;
  id_igreja: string;
  titulo: string;
  sub_titulo: string | null;
  qtd_vagas: number | null;
  status: 'Confirmado' | 'Pendente' | 'Cancelado';
  valor_inscricao: number;
  palestrante?: string | null;
  id_agenda?: string | null;
  created_at?: string;
  _count_inscricoes?: number;
  agenda?: {
    titulo: string;
    data_hora: string;
    local: string | null;
  };
};

type EventoArquivo = {
  id: string;
  id_evento: string;
  nome: string;
  tipo_arquivo: string | null;
  arquivo_base64: string | null;
  created_at?: string;
};

type EventoProgramacao = {
  id: string;
  id_evento: string;
  descricao: string;
  id_agenda: string | null;
  palestrante: string | null;
  data_hora?: string | null;
  created_at?: string;
  agenda?: {
    titulo: string;
    data_hora: string;
    local: string | null;
  };
};

type EventoInscricao = {
  id: string;
  id_evento: string;
  tipo_participante: 'Membro' | 'Visitante';
  id_membro: string | null;
  nome_visitante: string | null;
  valor_pago: number;
  data_pagamento: string | null;
  pago: boolean;
  created_at?: string;
  membro?: {
    nome: string;
  };
};

type MembroRes = {
  id: string;
  nome: string;
};

export default function EventosPage() {
  const { selectedIgreja } = useIgreja();
  const { confirmDelete } = useConfirm();

  // State Management
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [membros, setMembros] = useState<MembroRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals / Editing States
  const [activeTab, setActiveTab] = useState<'main' | 'arquivos' | 'programacao' | 'inscricoes'>('main');
  const [currentEvent, setCurrentEvent] = useState<Partial<Evento> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Specific Entity states for detail management
  const [arquivos, setArquivos] = useState<EventoArquivo[]>([]);
  const [programacao, setProgramacao] = useState<EventoProgramacao[]>([]);
  const [inscricoes, setInscricoes] = useState<EventoInscricao[]>([]);
  
  // Mini form states for sub-items
  const [showAddProg, setShowAddProg] = useState(false);
  const [progDesc, setProgDesc] = useState('');
  const [progPalestrante, setProgPalestrante] = useState('');
  const [progCreateAgenda, setProgCreateAgenda] = useState(false);
  const [progAgendaDataHora, setProgAgendaDataHora] = useState('');
  const [progAgendaLocal, setProgAgendaLocal] = useState('');

  // New features state
  const [isDragging, setIsDragging] = useState(false);
  const [editingProgId, setEditingProgId] = useState<string | null>(null);
  const [progDataHora, setProgDataHora] = useState('');
  const [eventCreateAgenda, setEventCreateAgenda] = useState(false);
  const [eventAgendaDataHora, setEventAgendaDataHora] = useState('');
  const [eventAgendaLocal, setEventAgendaLocal] = useState('');

  const [showAddInsc, setShowAddInsc] = useState(false);
  const [inscTipo, setInscTipo] = useState<'Membro' | 'Visitante'>('Membro');
  const [inscIdMembro, setInscIdMembro] = useState('');
  const [inscNomeVisitante, setInscNomeVisitante] = useState('');
  const [inscValorPago, setInscValorPago] = useState<number>(0);
  const [inscDataPagamento, setInscDataPagamento] = useState('');
  const [inscPago, setInscPago] = useState(false);

  // Error/Success statuses
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    if (selectedIgreja?.id) {
      fetchEventos();
      fetchMembros();
    }
  }, [selectedIgreja]);

  // Ref for uploading event files
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEventos = async () => {
    try {
      setLoading(true);
      setError('');
      if (!selectedIgreja?.id) return;

      const { data, error: err } = await supabase
        .from('eventos')
        .select(`
          *,
          agenda:agendas (
            titulo,
            data_hora,
            local
          ),
          eventos_inscricoes(count)
        `)
        .eq('id_igreja', selectedIgreja.id)
        .order('created_at', { ascending: false });

      if (err) throw err;

      const mapped = (data || []).map((x: any) => ({
        ...x,
        _count_inscricoes: x.eventos_inscricoes?.[0]?.count || 0
      }));

      setEventos(mapped);
    } catch (e: any) {
      console.error('Error fetching eventos:', e);
      setError('Falha ao carregar lista de eventos.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembros = async () => {
    try {
      if (!selectedIgreja?.id) return;
      const { data, error: err } = await supabase
        .from('membros')
        .select('id, nome')
        .eq('id_igreja', selectedIgreja.id)
        .order('nome');
      if (err) throw err;
      setMembros(data || []);
    } catch (e) {
      console.error('Error fetching membros:', e);
    }
  };

  // Sub-items fetching when an event is selected or activeTab changes
  useEffect(() => {
    if (currentEvent?.id) {
      if (activeTab === 'arquivos') fetchArquivos(currentEvent.id);
      if (activeTab === 'programacao') fetchProgramacao(currentEvent.id);
      if (activeTab === 'inscricoes') fetchInscricoes(currentEvent.id);
    }
  }, [currentEvent?.id, activeTab]);

  const fetchArquivos = async (eventoId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('eventos_arquivos')
        .select('*')
        .eq('id_evento', eventoId)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setArquivos(data || []);
    } catch (e) {
      console.error('Error fetching arquivos:', e);
    }
  };

  const fetchProgramacao = async (eventoId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('eventos_programacao')
        .select(`
          *,
          agenda:agendas (
            titulo,
            data_hora,
            local
          )
        `)
        .eq('id_evento', eventoId)
        .order('created_at', { ascending: true });
      if (err) throw err;
      setProgramacao(data || []);
    } catch (e) {
      console.error('Error fetching programacao:', e);
    }
  };

  const fetchInscricoes = async (eventoId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('eventos_inscricoes')
        .select(`
          *,
          membro:membros (
            nome
          )
        `)
        .eq('id_evento', eventoId)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setInscricoes(data || []);
    } catch (e) {
      console.error('Error fetching inscricoes:', e);
    }
  };

  // Actions for Event main crud
  const handleOpenNewEvent = () => {
    setCurrentEvent({
      titulo: '',
      sub_titulo: '',
      qtd_vagas: null,
      status: 'Confirmado',
      valor_inscricao: 0,
      palestrante: '',
      id_agenda: null
    });
    setEventCreateAgenda(false);
    setEventAgendaDataHora('');
    setEventAgendaLocal('');
    setActiveTab('main');
    setIsModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleOpenEditEvent = (evt: Evento) => {
    setCurrentEvent(evt);
    if (evt.id_agenda && evt.agenda) {
      setEventCreateAgenda(true);
      setEventAgendaDataHora(evt.agenda.data_hora ? new Date(evt.agenda.data_hora).toISOString().slice(0, 16) : '');
      setEventAgendaLocal(evt.agenda.local || '');
    } else {
      setEventCreateAgenda(false);
      setEventAgendaDataHora('');
      setEventAgendaLocal('');
    }
    setActiveTab('main');
    setIsModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent || !selectedIgreja?.id) return;
    if (!currentEvent.titulo?.trim()) {
      setError('O título do evento é obrigatório.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setSuccess('');

      // Agenda item handling (create, update, or delete)
      let agendaId: string | null = currentEvent.id_agenda || null;
      if (eventCreateAgenda && eventAgendaDataHora) {
        const agendaPayload = {
          id_igreja: selectedIgreja.id,
          titulo: `Evento: ${currentEvent.titulo}`,
          data_hora: new Date(eventAgendaDataHora).toISOString(),
          local: eventAgendaLocal || null,
          status: 'Normal' as any,
          privado: false
        };

        if (agendaId) {
          // Update
          const { error: agendaErr } = await supabase
            .from('agendas')
            .update(agendaPayload)
            .eq('id', agendaId);
          if (agendaErr) throw agendaErr;
        } else {
          // Create
          const { data: agendaData, error: agendaErr } = await supabase
            .from('agendas')
            .insert([agendaPayload])
            .select('id')
            .single();
          if (agendaErr) throw agendaErr;
          agendaId = agendaData?.id || null;
        }
      } else if (!eventCreateAgenda && agendaId) {
        // Untoggled, delete associated agenda
        await supabase.from('agendas').delete().eq('id', agendaId);
        agendaId = null;
      }

      const payload = {
        id_igreja: selectedIgreja.id,
        titulo: currentEvent.titulo,
        sub_titulo: currentEvent.sub_titulo || null,
        qtd_vagas: currentEvent.qtd_vagas || null,
        status: currentEvent.status || 'Confirmado',
        valor_inscricao: Number(currentEvent.valor_inscricao || 0),
        palestrante: currentEvent.palestrante || null,
        id_agenda: agendaId
      };

      if (currentEvent.id) {
        // Edit Mode
        const { data, error: err } = await supabase
          .from('eventos')
          .update(payload)
          .eq('id', currentEvent.id)
          .select(`
            *,
            agenda:agendas (
              titulo,
              data_hora,
              local
            ),
            eventos_inscricoes(count)
          `)
          .single();
        if (err) throw err;
        setSuccess('Evento atualizado com sucesso!');
        
        const mapped = {
          ...data,
          _count_inscricoes: data.eventos_inscricoes?.[0]?.count || 0
        };
        setCurrentEvent(mapped);
      } else {
        // Create Mode
        const { data, error: err } = await supabase
          .from('eventos')
          .insert([payload])
          .select(`
            *,
            agenda:agendas (
              titulo,
              data_hora,
              local
            ),
            eventos_inscricoes(count)
          `)
          .single();
        if (err) throw err;
        setSuccess('Evento cadastrado com sucesso!');
        
        const mapped = {
          ...data,
          _count_inscricoes: data.eventos_inscricoes?.[0]?.count || 0
        };
        setCurrentEvent(mapped);
      }

      await fetchEventos();
    } catch (e: any) {
      console.error('Error saving evento:', e);
      setError(e.message || 'Falha ao gravar evento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string, name: string) => {
    confirmDelete({
      message: `Tem certeza que deseja apagar o evento "${name}"? Todos os arquivos, programações e inscrições vinculados serão excluídos.`,
      onConfirm: async () => {
        try {
          setError('');
          const { error: err } = await supabase
            .from('eventos')
            .delete()
            .eq('id', id);
          if (err) throw err;
          setSuccess('Evento apagado com sucesso!');
          fetchEventos();
          if (currentEvent?.id === id) {
            setIsModalOpen(false);
            setCurrentEvent(null);
          }
        } catch (e: any) {
          console.error('Error deleting event:', e);
          setError(e.message || 'Erro ao apagar evento.');
        }
      }
    });
  };

  // Helper for actual upload of a single file
  const processAndUploadFile = async (file: File) => {
    if (!file || !currentEvent?.id) return;

    try {
      setUploadingFile(true);
      setError('');
      setSuccess('');

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          const payload = {
            id_evento: currentEvent.id,
            nome: file.name,
            tipo_arquivo: file.type || 'application/octet-stream',
            arquivo_base64: base64String
          };

          const { error: err } = await supabase
            .from('eventos_arquivos')
            .insert([payload]);

          if (err) throw err;

          setSuccess('Arquivo anexado com sucesso!');
          fetchArquivos(currentEvent.id!);
        } catch (uploadErr: any) {
          setError(uploadErr.message || 'Erro ao gravar arquivo no banco.');
        } finally {
          setUploadingFile(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadingFile(false);
      setError('Falha ao processar arquivo para upload.');
    }
  };

  // Sub-entity: Arquivos upload and download
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processAndUploadFile(file);
    }
  };

  const handleDownloadFile = (arq: EventoArquivo) => {
    if (!arq.arquivo_base64) return;
    try {
      const link = document.createElement('a');
      link.href = arq.arquivo_base64;
      link.download = arq.nome;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Error downloading file:', e);
    }
  };

  const handleDeleteArquivo = async (id: string) => {
    confirmDelete({
      message: 'Tem certeza que deseja apagar este arquivo?',
      onConfirm: async () => {
        try {
          const { error: err } = await supabase
            .from('eventos_arquivos')
            .delete()
            .eq('id', id);
          if (err) throw err;
          setSuccess('Arquivo removido com sucesso!');
          fetchArquivos(currentEvent!.id!);
        } catch (e: any) {
          setError(e.message || 'Erro ao apagar arquivo.');
        }
      }
    });
  };

  // Sub-entity: Programação do Evento with potential connection with church agenda
  const handleSaveProgramacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent?.id) return;
    if (!progDesc.trim()) {
      setError('A descrição da programação é obrigatória.');
      return;
    }

    try {
      setError('');
      setSuccess('');

      const payload = {
        id_evento: currentEvent.id,
        descricao: progDesc,
        data_hora: progDataHora ? new Date(progDataHora).toISOString() : null,
        id_agenda: null,
        palestrante: null
      };

      if (editingProgId) {
        // Edit Mode
        const { error: progErr } = await supabase
          .from('eventos_programacao')
          .update(payload)
          .eq('id', editingProgId);

        if (progErr) throw progErr;
        setSuccess('Programação atualizada com sucesso!');
      } else {
        // Create Mode
        const { error: progErr } = await supabase
          .from('eventos_programacao')
          .insert([payload]);

        if (progErr) throw progErr;
        setSuccess('Programação adicionada com sucesso!');
      }

      setProgDesc('');
      setProgDataHora('');
      setEditingProgId(null);
      setShowAddProg(false);
      fetchProgramacao(currentEvent.id);
    } catch (err: any) {
      console.error('Error writing programacao:', err);
      setError(err.message || 'Falha ao salvar programação.');
    }
  };

  const handleStartEditProgramacao = (item: EventoProgramacao) => {
    setEditingProgId(item.id);
    setProgDesc(item.descricao);
    setProgDataHora(item.data_hora ? new Date(item.data_hora).toISOString().slice(0, 16) : '');
    setShowAddProg(true);
  };

  const handleCancelEditProgramacao = () => {
    setEditingProgId(null);
    setProgDesc('');
    setProgDataHora('');
    setShowAddProg(false);
  };

  const handleDeleteProgramacao = async (id: string, associatedAgendaId: string | null) => {
    confirmDelete({
      message: 'Deseja excluir este item da programação? Se houver um compromisso associado na Agenda, o mesmo será excluído automaticamente.',
      onConfirm: async () => {
        try {
          // Direct Delete segment
          const { error: err } = await supabase
            .from('eventos_programacao')
            .delete()
            .eq('id', id);
          if (err) throw err;

          // Optionally delete agendas item? Let's clean the agenda table as well to make it clean!
          if (associatedAgendaId) {
            await supabase.from('agendas').delete().eq('id', associatedAgendaId);
          }

          setSuccess('Item de programação removido com sucesso!');
          fetchProgramacao(currentEvent!.id!);
        } catch (e: any) {
          setError(e.message || 'Falha ao deletar item da programação.');
        }
      }
    });
  };

  // Sub-entity: Inscrições do Evento
  const handleSaveInscricao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent?.id) return;

    if (inscTipo === 'Membro' && !inscIdMembro) {
      setError('Por favor, selecione um membro.');
      return;
    }
    if (inscTipo === 'Visitante' && !inscNomeVisitante.trim()) {
      setError('O nome do visitante é obrigatório.');
      return;
    }

    try {
      setError('');
      setSuccess('');

      const payload = {
        id_evento: currentEvent.id,
        tipo_participante: inscTipo,
        id_membro: inscTipo === 'Membro' ? inscIdMembro : null,
        nome_visitante: inscTipo === 'Visitante' ? inscNomeVisitante : null,
        valor_pago: Number(inscValorPago || 0),
        data_pagamento: inscDataPagamento ? inscDataPagamento : null,
        pago: inscPago
      };

      const { error: err } = await supabase
        .from('eventos_inscricoes')
        .insert([payload]);

      if (err) throw err;

      setSuccess('Inscrição registrada com sucesso!');
      setInscIdMembro('');
      setInscNomeVisitante('');
      setInscValorPago(0);
      setInscDataPagamento('');
      setInscPago(false);
      setShowAddInsc(false);
      fetchInscricoes(currentEvent.id);
      fetchEventos(); // Refresh totals
    } catch (e: any) {
      console.error('Error writing events registration:', e);
      setError(e.message || 'Falha ao salvar inscrição.');
    }
  };

  const handleDeleteInscricao = async (id: string) => {
    confirmDelete({
      message: 'Deseja cancelar esta inscrição?',
      onConfirm: async () => {
        try {
          const { error: err } = await supabase
            .from('eventos_inscricoes')
            .delete()
            .eq('id', id);
          if (err) throw err;
          setSuccess('Inscrição cancelada com sucesso!');
          fetchInscricoes(currentEvent!.id!);
          fetchEventos(); // Refresh totals
        } catch (e: any) {
          setError(e.message || 'Falha ao remover inscrição.');
        }
      }
    });
  };

  const handleTogglePagoInscricao = async (id: string, currentStatus: boolean) => {
    try {
      const { error: err } = await supabase
        .from('eventos_inscricoes')
        .update({
          pago: !currentStatus,
          data_pagamento: !currentStatus ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', id);
      if (err) throw err;
      fetchInscricoes(currentEvent!.id!);
    } catch (e: any) {
      console.error('Error updating payment status:', e);
    }
  };

  // Filters search calculation
  const filteredEventos = eventos.filter(evt => {
    const rawMatch = search.toLowerCase();
    return (
      evt.titulo.toLowerCase().includes(rawMatch) ||
      (evt.sub_titulo && evt.sub_titulo.toLowerCase().includes(rawMatch))
    );
  });

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 font-['Inter'] transition-colors p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header section with Action Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 sm:p-8 rounded-[2.5rem] shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <Ticket className="text-amber-500" size={24} />
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">
                Módulo de Eventos
              </h1>
            </div>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 font-bold uppercase tracking-wider">
              Gerencie inscrições, programações, ingressos e anexos para eventos da igreja
            </p>
          </div>

          <button
            onClick={handleOpenNewEvent}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#E4A232] hover:bg-[#E4A232]/95 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/10 cursor-pointer duration-200 active:scale-95"
          >
            <Plus size={16} />
            Novo Evento
          </button>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 rounded-3xl text-xs font-bold flex items-center gap-2.5">
            <XCircle size={18} />
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-3xl text-xs font-bold flex items-center gap-2.5">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        {/* Quick Toolbar (Search / Filters) */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 sm:px-6 rounded-3xl shadow-sm">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por título ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 py-3 pl-11 pr-4 rounded-2xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-semibold"
            />
          </div>
          <div className="text-[10px] text-slate-450 font-black uppercase tracking-widest sm:ml-auto">
            Total Encontrado: {filteredEventos.length} {filteredEventos.length === 1 ? 'evento' : 'eventos'}
          </div>
        </div>

        {/* Events Data List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-sm">
            <RefreshCw className="animate-spin text-amber-500 mb-3" size={28} />
            <p className="text-xs text-slate-400 font-black uppercase tracking-wider">Carregando lista de eventos...</p>
          </div>
        ) : filteredEventos.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-sm">
            <Ticket className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={48} />
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase">Nenhum evento registrado</h3>
            <p className="text-xs text-slate-400 mt-1 font-semibold max-w-sm mx-auto">
              {search ? 'Nenhum resultado corresponde à sua busca.' : 'Clique no botão acima para cadastrar o seu primeiro evento da igreja.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEventos.map((evt) => {
              const vagasDisponiveis = evt.qtd_vagas ? evt.qtd_vagas - (evt._count_inscricoes || 0) : null;
              const isEsgotado = vagasDisponiveis !== null && vagasDisponiveis <= 0;

              return (
                <div
                  key={evt.id}
                  className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 hover:border-amber-550/30 dark:hover:border-amber-510/30 rounded-[2rem] shadow-sm overflow-hidden flex flex-col group transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Status header line */}
                  <div className="flex justify-between items-center px-6 pt-6 pb-2">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      evt.status === 'Confirmado'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400'
                        : evt.status === 'Pendente'
                        ? 'bg-amber-50 border-amber-300 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400'
                        : 'bg-red-50 border-red-300 text-red-600 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400'
                    }`}>
                      {evt.status}
                    </span>
                    
                    <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-xl">
                      <DollarSign size={13} className="text-amber-500" />
                      {evt.valor_inscricao ? `R$ ${evt.valor_inscricao.toFixed(2)}` : 'Grátis'}
                    </span>
                  </div>

                  {/* Body content */}
                  <div className="px-6 py-4 flex-1">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-amber-500 transition leading-tight">
                      {evt.titulo}
                    </h3>
                    {evt.sub_titulo && (
                      <p className="text-[11px] text-slate-500 font-semibold mt-1.5 line-clamp-2">
                        {evt.sub_titulo}
                      </p>
                    )}

                    {/* Vagas indicators */}
                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider text-slate-400">
                        <Users size={12} />
                        <span>Inscrições:</span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {evt._count_inscricoes || 0}
                        </span>
                      </div>

                      {evt.qtd_vagas ? (
                        <div className={`text-[10px] font-black uppercase ${
                          isEsgotado ? 'text-red-550' : 'text-slate-450'
                        }`}>
                          {isEsgotado ? 'Esgotado' : `${vagasDisponiveis} / ${evt.qtd_vagas} Vagas`}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-450 font-bold uppercase">
                          Vagas Ilimitadas
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational Footer action bar */}
                  <div className="bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-850 px-6 py-4 flex justify-between items-center">
                    <button
                      onClick={() => handleOpenEditEvent(evt)}
                      className="text-[10px] font-black text-[#E4A232] hover:underline uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      Gerenciar Detalhes
                      <ChevronRight size={12} className="group-hover:translate-x-0.5 transition" />
                    </button>

                    <button
                      onClick={() => handleDeleteEvent(evt.id, evt.titulo)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-xl transition cursor-pointer"
                      title="Excluir Evento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* COMPREHENSIVE SIDE DETAILS DIALOG MODAL */}
        {isModalOpen && currentEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-150 dark:border-slate-800 shadow-2xl p-6 sm:p-10 w-full max-w-4xl my-8 relative max-h-[92vh] overflow-y-auto flex flex-col"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 cursor-pointer transition"
              >
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div className="flex flex-col gap-1 border-b border-slate-105 dark:border-slate-800 pb-5 mb-6">
                <div className="flex items-center gap-2">
                  <Ticket className="text-[#E4A232]" size={20} />
                  <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 dark:text-white leading-tight">
                    {currentEvent.id ? 'Gerenciador de Evento' : 'Novo Evento'}
                  </h2>
                </div>
                {currentEvent.titulo && (
                  <p className="text-[10px] text-slate-450 font-black uppercase tracking-widest mt-1 mr-12 select-none">
                    {currentEvent.titulo}
                  </p>
                )}
              </div>

              {/* Tabs selector */}
              {currentEvent.id && (
                <div className="flex flex-wrap gap-1.5 mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('main')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer select-none ${
                      activeTab === 'main'
                        ? 'bg-[#E4A232] text-white'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    Cadastro Geral
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('arquivos')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer select-none ${
                      activeTab === 'arquivos'
                        ? 'bg-[#E4A232] text-white'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    Anexos / Arquivos ({arquivos.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('programacao')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer select-none ${
                      activeTab === 'programacao'
                        ? 'bg-[#E4A232] text-white'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    Programação ({programacao.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('inscricoes')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer select-none ${
                      activeTab === 'inscricoes'
                        ? 'bg-[#E4A232] text-white'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    Inscrições ({inscricoes.length})
                  </button>
                </div>
              )}

              {/* TAB CONTENT: MAIN EVENT INFO */}
              {activeTab === 'main' && (
                <form onSubmit={handleSaveEvent} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-400">
                        Título do Evento *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Nome principal do evento"
                        value={currentEvent.titulo || ''}
                        onChange={(e) => setCurrentEvent({...currentEvent, titulo: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 p-3.5 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-400">
                        Sub-Título / Descrição
                      </label>
                      <input
                        type="text"
                        placeholder="Breve descrição, slogan ou frase auxiliar"
                        value={currentEvent.sub_titulo || ''}
                        onChange={(e) => setCurrentEvent({...currentEvent, sub_titulo: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 p-3.5 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-400">
                        Quantidade de Vagas
                      </label>
                      <input
                        type="number"
                        placeholder="Em branco para vagas ilimitadas"
                        value={currentEvent.qtd_vagas || ''}
                        onChange={(e) => setCurrentEvent({...currentEvent, qtd_vagas: e.target.value ? parseInt(e.target.value, 10) : null})}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 p-3.5 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-400">
                        Valor das Inscrições (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00 para gratuito"
                        value={currentEvent.valor_inscricao !== undefined ? currentEvent.valor_inscricao : ''}
                        onChange={(e) => setCurrentEvent({...currentEvent, valor_inscricao: parseFloat(e.target.value) || 0})}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 p-3.5 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-400">
                        Status do Evento
                      </label>
                      <select
                        value={currentEvent.status || 'Confirmado'}
                        onChange={(e) => setCurrentEvent({...currentEvent, status: e.target.value as any})}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 p-3.5 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                      >
                        <option value="Confirmado">1) Confirmado</option>
                        <option value="Pendente">2) Pendente</option>
                        <option value="Cancelado">3) Cancelado</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-400">
                        Palestrante Principal
                      </label>
                      <input
                        type="text"
                        maxLength={255}
                        placeholder="Nome do Palestrante principal (campo livre)"
                        value={currentEvent.palestrante || ''}
                        onChange={(e) => setCurrentEvent({...currentEvent, palestrante: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 p-3.5 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-2 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-3">
                      <label className="flex items-center gap-2.5 cursor-pointer selection:bg-transparent">
                        <input
                          type="checkbox"
                          checked={eventCreateAgenda}
                          onChange={(e) => setEventCreateAgenda(e.target.checked)}
                          className="w-4 h-4 rounded text-[#E4A232] focus:ring-amber-500 accent-amber-500 cursor-pointer"
                        />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">
                          Auto-criar/Sincronizar compromisso correspondente na Agenda da igreja
                        </span>
                      </label>

                      {eventCreateAgenda && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 font-black">Data e Hora do Evento *</label>
                            <input
                              type="datetime-local"
                              required={eventCreateAgenda}
                              value={eventAgendaDataHora}
                              onChange={(e) => setEventAgendaDataHora(e.target.value)}
                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-xs font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 font-black">Local / Sala</label>
                            <input
                              type="text"
                              placeholder="Auditório principal, sala 3, etc."
                              value={eventAgendaLocal}
                              onChange={(e) => setEventAgendaLocal(e.target.value)}
                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-xs font-bold"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer select-none"
                    >
                      Fechar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3 rounded-xl bg-[#E4A232] hover:bg-[#E4A232]/90 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition cursor-pointer select-none"
                    >
                      <Save size={14} />
                      {isSubmitting ? 'Salvando...' : 'Salvar Dados'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB CONTENT: ARQUIVOS ATTACHMENTS */}
              {activeTab === 'arquivos' && currentEvent.id && (
                <div className="space-y-6">
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        await processAndUploadFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-[2rem] transition-all text-center space-y-3 cursor-pointer ${
                      isDragging 
                        ? 'border-amber-500 bg-amber-500/10 scale-[1.01]' 
                        : 'border-slate-205 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="p-3 bg-amber-500/10 rounded-full text-[#E4A232]">
                      <Upload size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                        Arraste seu arquivo aqui ou clique para selecionar
                      </p>
                      <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1">
                        Anexe manuais, cartazes, fichas de inscrição ou cronogramas
                      </p>
                    </div>

                    {uploadingFile && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold">
                        <RefreshCw size={12} className="animate-spin" />
                        Salvando arquivo no banco de dados...
                      </div>
                    )}

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {arquivos.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-850 rounded-[1.5rem]">
                      <FileText className="mx-auto text-slate-350 dark:text-slate-600 mb-2" size={32} />
                      <p className="text-xs font-bold text-slate-450 uppercase">Nenhum arquivo anexado para este evento</p>
                      <p className="text-[9px] text-slate-400 max-w-xs mx-auto mt-0.5">Use o botão acima para enviar arquivos importantes que serão armazenados diretamente no banco de dados.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                      {arquivos.map((arq) => (
                        <div key={arq.id} className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-950/20">
                          <div className="flex items-center gap-2.5">
                            <FileText className="text-amber-500" size={16} />
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-250 pr-4 truncate max-w-sm sm:max-w-md">
                                {arq.nome}
                              </p>
                              {arq.tipo_arquivo && (
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{arq.tipo_arquivo}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(arq)}
                              className="p-2 text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Baixar Arquivo"
                            >
                              <Download size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteArquivo(arq.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-150 dark:hover:bg-red-950/20 rounded-lg transition"
                              title="Deletar Arquivo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: EVENT PROGRAMAÇÃO */}
              {activeTab === 'programacao' && currentEvent.id && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white">Linha do Tempo da Programação</h4>
                      <p className="text-[10px] text-slate-450 font-medium">Cadastre palestras, apresentações, cultos e reuniões do evento.</p>
                    </div>

                    {!showAddProg && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProgId(null);
                          setProgDesc('');
                          setProgDataHora('');
                          setShowAddProg(true);
                        }}
                        className="flex items-center gap-1 px-4 py-2 rounded-xl bg-[#E4A232] text-white text-[10px] font-black uppercase tracking-wider cursor-pointer"
                      >
                        <Plus size={12} />
                        Adicionar Grade
                      </button>
                    )}
                  </div>

                  {/* Add/Edit Program form drawer */}
                  {showAddProg && (
                    <form onSubmit={handleSaveProgramacao} className="p-5 border border-slate-205 dark:border-slate-800 rounded-[1.8rem] bg-slate-50/50 dark:bg-slate-950/20 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#E4A232]">
                          {editingProgId ? 'Editar Item da Grade de Programação' : 'Novo Item na Grade de Programação'}
                        </span>
                        <button type="button" onClick={handleCancelEditProgramacao} className="text-slate-450 hover:text-slate-700">
                          <X size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-450 font-black">Descrição do Item *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Abertura oficial ou Palestra Magna"
                            value={progDesc}
                            onChange={(e) => setProgDesc(e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-lg text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-450 font-black">Data e Hora da Programação</label>
                          <input
                            type="datetime-local"
                            value={progDataHora}
                            onChange={(e) => setProgDataHora(e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-lg text-xs font-bold"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleCancelEditProgramacao}
                          className="px-4 py-2 text-[10px] uppercase font-black tracking-wider text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 text-[10px] uppercase font-black tracking-wider bg-[#E4A232] text-white rounded-lg"
                        >
                          {editingProgId ? 'Confirmar Alteração' : 'Confirmar Adição'}
                        </button>
                      </div>
                    </form>
                  )}

                  {programacao.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-850 rounded-[1.5rem]">
                      <ClipboardList className="mx-auto text-slate-350 dark:text-slate-650 mb-2" size={32} />
                      <p className="text-xs font-bold text-slate-450 uppercase">Nenhuma programação descrita ainda</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Use o botão de Grade acima para inserir itens de programação.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {programacao.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-amber-500/20 transition"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-slate-900 dark:text-white">{item.descricao}</span>
                            </div>

                            {item.data_hora && (
                              <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-slate-450">
                                <Calendar size={12} className="text-amber-500" />
                                <span className="text-slate-750 dark:text-slate-300">
                                  {new Date(item.data_hora).toLocaleString('pt-BR')}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 sm:ml-auto">
                            <button
                              type="button"
                              onClick={() => handleStartEditProgramacao(item)}
                              className="p-2 text-slate-400 hover:text-[#E4A232] hover:bg-amber-50/50 dark:hover:bg-amber-950/20 rounded-xl transition"
                              title="Editar Programação"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProgramacao(item.id, item.id_agenda)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-xl transition"
                              title="Remover Programação"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: EVENT INSCRIÇÕES */}
              {activeTab === 'inscricoes' && currentEvent.id && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white">Gerenciador de Inscrições</h4>
                      <p className="text-[10px] text-slate-450 font-medium">Consulte pagamentos e registre participantes membros ou visitantes manualmente.</p>
                    </div>

                    {!showAddInsc && (
                      <button
                        type="button"
                        onClick={() => setShowAddInsc(true)}
                        className="flex items-center gap-1 px-4 py-2 rounded-xl bg-[#E4A232] text-white text-[10px] font-black uppercase tracking-wider cursor-pointer"
                      >
                        <Plus size={12} />
                        Registrar Inscrição
                      </button>
                    )}
                  </div>

                  {/* Add Inscricao Drawer Form */}
                  {showAddInsc && (
                    <form onSubmit={handleSaveInscricao} className="p-5 border border-slate-205 dark:border-slate-800 rounded-[1.8rem] bg-slate-50/50 dark:bg-slate-950/20 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#E4A232]">Adicionar Novo Participante</span>
                        <button type="button" onClick={() => setShowAddInsc(false)} className="text-slate-450 hover:text-slate-700">
                          <X size={14} />
                        </button>
                      </div>

                      {/* Participant Type Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-450 block">Membro da Igreja ou Visitante?</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setInscTipo('Membro'); setInscNomeVisitante(''); }}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                              inscTipo === 'Membro'
                                ? 'bg-slate-900 text-white dark:bg-slate-800'
                                : 'bg-white border border-slate-220 text-slate-500 dark:bg-slate-950'
                            }`}
                          >
                            Membro da Igreja
                          </button>
                          <button
                            type="button"
                            onClick={() => { setInscTipo('Visitante'); setInscIdMembro(''); }}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                              inscTipo === 'Visitante'
                                ? 'bg-slate-900 text-white dark:bg-slate-800'
                                : 'bg-white border border-slate-220 text-slate-500 dark:bg-slate-950'
                            }`}
                          >
                            Visitante Externo
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {inscTipo === 'Membro' ? (
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-450">Selecionar Membro *</label>
                            <select
                              required={inscTipo === 'Membro'}
                              value={inscIdMembro}
                              onChange={(e) => setInscIdMembro(e.target.value)}
                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-lg text-xs font-bold"
                            >
                              <option value="">Selecione na lista de membros...</option>
                              {membros.map((m) => (
                                <option key={m.id} value={m.id}>{m.nome}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-450">Nome do Visitante *</label>
                            <input
                              type="text"
                              required={inscTipo === 'Visitante'}
                              placeholder="Fórmula nome completo do visitante"
                              value={inscNomeVisitante}
                              onChange={(e) => setInscNomeVisitante(e.target.value)}
                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-lg text-xs font-bold"
                            />
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-450">Valor Pago (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Deixe em branco ou 0 caso não pago"
                            value={inscValorPago || ''}
                            onChange={(e) => setInscValorPago(parseFloat(e.target.value) || 0)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-lg text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-450">Data do Pagamento</label>
                          <input
                            type="date"
                            value={inscDataPagamento}
                            onChange={(e) => setInscDataPagamento(e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-lg text-xs font-bold"
                          />
                        </div>

                        <div className="flex items-center gap-2 pl-1 select-none">
                          <input
                            type="checkbox"
                            id="pagoCheck"
                            checked={inscPago}
                            onChange={(e) => setInscPago(e.target.checked)}
                            className="w-4 h-4 rounded text-[#E4A232] focus:ring-amber-500 accent-amber-500 cursor-pointer"
                          />
                          <label htmlFor="pagoCheck" className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 cursor-pointer">
                            Inscrição Confirmada como Paga (Pago / Sim)
                          </label>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddInsc(false)}
                          className="px-4 py-2 text-[10px] uppercase font-black tracking-wider text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 text-[10px] uppercase font-black tracking-wider bg-[#E4A232] text-white rounded-lg"
                        >
                          Inserir Participante
                        </button>
                      </div>
                    </form>
                  )}

                  {inscricoes.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-850 rounded-[1.5rem]">
                      <Users className="mx-auto text-slate-350 dark:text-slate-650 mb-2" size={32} />
                      <p className="text-xs font-bold text-slate-450 uppercase">Nenhum participante registrado para o evento</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Use o botão de Registro de Inscrição acima para realizar o preenchimento de membros na igreja ou convidados externos.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {inscricoes.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl flex flex-wrap justify-between items-center gap-4 hover:border-amber-500/20 transition"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-450 text-xs">
                              {item.tipo_participante === 'Membro' ? 'M' : 'V'}
                            </div>

                            <div>
                              <p className="text-xs font-black text-slate-900 dark:text-white">
                                {item.tipo_participante === 'Membro' ? item.membro?.nome : item.nome_visitante}
                              </p>
                              <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">
                                {item.tipo_participante} {item.valor_pago ? ` | Pago: R$ ${item.valor_pago.toFixed(2)}` : ''} 
                                {item.data_pagamento ? ` em ${new Date(item.data_pagamento).toLocaleDateString('pt-BR')}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Pago checkbox status switcher directly on row */}
                            <button
                              type="button"
                              onClick={() => handleTogglePagoInscricao(item.id, item.pago)}
                              className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition ${
                                item.pago
                                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-red-500/5 border-red-500/10 text-red-600 dark:text-red-400'
                              }`}
                            >
                              <CheckSquare size={12} className={item.pago ? 'text-emerald-500' : 'text-slate-400'} />
                              {item.pago ? 'Inscrição Paga' : 'Não Pago'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteInscricao(item.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-red-950/20 rounded-xl transition"
                              title="Cancelar Inscrição"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}

      </div>
    </main>
  );
}
