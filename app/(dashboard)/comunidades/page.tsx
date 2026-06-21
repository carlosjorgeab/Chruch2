'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useIgreja } from '@/context/IgrejaContext';
import { useConfirm } from '@/context/ConfirmContext';
import { Plus, Edit2, Trash2, Save, X, Search, Users, Calendar, MapPin, RefreshCw, ClipboardCheck } from 'lucide-react';

type Comunidade = {
  id: string;
  id_igreja: string;
  nome: string;
  descricao: string | null;
  dia_reuniao: string | null;
  horario: string | null;
  local: string | null;
  id_lider: string | null;
  id_segundo_lider: string | null;
  id_terceiro_lider: string | null;
  imagem_base64: string | null;
  imagem_nome: string | null;
  categoria: string | null;
  lider?: { nome: string };
  segundo_lider?: { nome: string };
  terceiro_lider?: { nome: string };
};

type Membro = {
  id: string;
  nome: string;
};

type AssociatedMember = {
  id: string;
  nome: string;
  relationId: string;
};

export default function ComunidadesPage() {
  const { selectedIgreja } = useIgreja();
  const { confirmDelete } = useConfirm();
  const [comunidades, setComunidades] = useState<Comunidade[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState('');
  
  const [associatedMembers, setAssociatedMembers] = useState<AssociatedMember[]>([]);
  const [selectedAddMember, setSelectedAddMember] = useState<string>('');

  const [currentComunidade, setCurrentComunidade] = useState<Partial<Comunidade>>({
    nome: '',
    descricao: '',
    dia_reuniao: 'Quarta-feira',
    horario: '19:30',
    local: '',
    id_lider: '',
    id_segundo_lider: '',
    id_terceiro_lider: '',
    imagem_base64: '',
    imagem_nome: '',
    categoria: 'Adultos',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Meetings (reuniões) & presence list states
  const [meetingsComunidade, setMeetingsComunidade] = useState<any[]>([]);
  const [showMeetingsModal, setShowMeetingsModal] = useState(false);
  const [selectedComunidadeForMeetings, setSelectedComunidadeForMeetings] = useState<Comunidade | null>(null);

  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDate, setNewMeetingDate] = useState('');
  const [newMeetingTime, setNewMeetingTime] = useState('');
  const [newMeetingLocal, setNewMeetingLocal] = useState('');
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);
  const [meetingError, setMeetingError] = useState('');

  const [meetingPresenceList, setMeetingPresenceList] = useState<any[]>([]);
  const [currentPresMeetingId, setCurrentPresMeetingId] = useState<string | null>(null);
  const [currentPresMeetingTitle, setCurrentPresMeetingTitle] = useState('');
  const [showPresMeetingModal, setShowPresMeetingModal] = useState(false);
  const [loadingPresence, setLoadingPresence] = useState(false);
  const [savingPresence, setSavingPresence] = useState(false);

  useEffect(() => {
    if (selectedIgreja) {
      fetchComunidades();
      fetchMembros();
    } else {
      setComunidades([]);
      setMembros([]);
      setLoading(false);
    }
  }, [selectedIgreja]);

  const fetchMeetings = async (comunidadeId: string) => {
    try {
      const { data, error: meetErr } = await supabase
        .from('agendas')
        .select('*')
        .eq('id_comunidade', comunidadeId)
        .order('data_hora', { ascending: false });
      if (meetErr) throw meetErr;
      setMeetingsComunidade(data || []);
    } catch (e) {
      console.error('Error fetching meetings:', e);
    }
  };

  const openMeetingsPanel = (com: Comunidade) => {
    setSelectedComunidadeForMeetings(com);
    setMeetingsComunidade([]);
    setShowMeetingsModal(true);
    fetchMeetings(com.id);
    
    // Default form fields
    setNewMeetingTitle(`Reunião ${com.nome}`);
    const todayStr = new Date().toISOString().split('T')[0];
    setNewMeetingDate(todayStr);
    setNewMeetingTime(com.horario || '19:30');
    setNewMeetingLocal(com.local || '');
    setMeetingError('');
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComunidadeForMeetings || !selectedIgreja) return;
    setSchedulingMeeting(true);
    setMeetingError('');
    try {
      const dtString = `${newMeetingDate}T${newMeetingTime}:00`;
      const dateIso = new Date(dtString).toISOString();
      const payload = {
        id_igreja: selectedIgreja.id,
        id_comunidade: selectedComunidadeForMeetings.id,
        titulo: newMeetingTitle.trim(),
        data_hora: dateIso,
        local: newMeetingLocal.trim() || null,
        privado: false,
        status: 'Normal'
      };

      const { error: insErr } = await supabase
        .from('agendas')
        .insert(payload);

      if (insErr) throw insErr;
      
      // Refresh list
      fetchMeetings(selectedComunidadeForMeetings.id);
      
      // Reset title
      setNewMeetingTitle(`Reunião ${selectedComunidadeForMeetings.nome}`);
    } catch (err: any) {
      console.error('Error scheduling meeting:', err);
      setMeetingError('Erro ao agendar reunião: ' + err.message);
    } finally {
      setSchedulingMeeting(false);
    }
  };

  const openCommunityPresence = async (meeting: any) => {
    setCurrentPresMeetingId(meeting.id);
    setCurrentPresMeetingTitle(meeting.titulo);
    setLoadingPresence(true);
    setMeetingPresenceList([]);
    try {
      // 1. Fetch community members
      const { data: membersData, error: membErr } = await supabase
        .from('membros_comunidade')
        .select(`
          id_membro,
          membros:membros!id_membro(nome)
        `)
        .eq('id_comunidade', selectedComunidadeForMeetings?.id);

      if (membErr) throw membErr;

      // 2. Fetch existing presence records
      const { data: presenceData, error: presErr } = await supabase
        .from('chamada_reuniao')
        .select('*')
        .eq('id_agenda', meeting.id);

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

      setMeetingPresenceList(formattedList);
      setShowPresMeetingModal(true);
    } catch (e) {
      console.error('Error loading community presence:', e);
    } finally {
      setLoadingPresence(false);
    }
  };

  const saveCommunityPresence = async () => {
    if (!currentPresMeetingId) return;
    setSavingPresence(true);
    try {
      if (meetingPresenceList.length > 0) {
        const upserts = meetingPresenceList.map(item => ({
          id_agenda: currentPresMeetingId,
          id_membro: item.id_membro,
          presente: item.presente
        }));

        const { error: upsertErr } = await supabase
          .from('chamada_reuniao')
          .upsert(upserts, { onConflict: 'id_agenda,id_membro' });

        if (upsertErr) throw upsertErr;
      }
      setShowPresMeetingModal(false);
      if (selectedComunidadeForMeetings) {
        fetchMeetings(selectedComunidadeForMeetings.id);
      }
    } catch (e) {
      console.error('Error saving community presence:', e);
    } finally {
      setSavingPresence(false);
    }
  };

  async function fetchComunidades() {
    if (!selectedIgreja) return;
    try {
      setLoading(true);
      setError('');
      const { data, error: err } = await supabase
        .from('comunidades')
        .select(`
          *,
          lider:membros!id_lider(nome),
          segundo_lider:membros!id_segundo_lider(nome),
          terceiro_lider:membros!id_terceiro_lider(nome)
        `)
        .eq('id_igreja', selectedIgreja.id)
        .order('nome', { ascending: true });

      if (err) throw err;
      if (data) {
        setComunidades(data as any);
      }
    } catch (e: any) {
      setError('Erro ao carregar comunidades: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function fetchAssociatedMembers(comunidadeId: string) {
    try {
      const { data, error: err } = await supabase
        .from('membros_comunidade')
        .select(`
          id,
          id_membro,
          membros!id_membro(id, nome)
        `)
        .eq('id_comunidade', comunidadeId);

      if (!err && data) {
        const processed = data.map((d: any) => ({
          id: d.id_membro,
          nome: d.membros?.nome || 'Membro desconhecido',
          relationId: d.id
        }));
        setAssociatedMembers(processed);
      } else {
        setAssociatedMembers([]);
      }
    } catch (e) {
      console.error('Erro ao buscar membros associados:', e);
    }
  }

  const handleAddMember = async () => {
    if (!currentComunidade.id) return;
    if (!selectedAddMember) {
      setError('Selecione um membro para adicionar.');
      return;
    }
    if (associatedMembers.some(m => m.id === selectedAddMember)) {
      setError('Este membro já faz parte desta comunidade.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      const { error: insertErr } = await supabase
        .from('membros_comunidade')
        .insert({
          id_comunidade: currentComunidade.id,
          id_membro: selectedAddMember
        });

      if (insertErr) throw insertErr;
      setSuccess('Membro adicionado à comunidade com sucesso!');
      setSelectedAddMember('');
      fetchAssociatedMembers(currentComunidade.id);
    } catch (e: any) {
      setError('Erro ao adicionar membro: ' + (e.message || e));
    }
  };

  const handleRemoveMember = async (relationId: string) => {
    if (!currentComunidade.id) return;
    try {
      setError('');
      setSuccess('');
      const { error: deleteErr } = await supabase
        .from('membros_comunidade')
        .delete()
        .eq('id', relationId);

      if (deleteErr) throw deleteErr;
      setSuccess('Membro removido da comunidade.');
      fetchAssociatedMembers(currentComunidade.id);
    } catch (e: any) {
      setError('Erro ao remover membro: ' + (e.message || e));
    }
  };

  async function fetchMembros() {
    if (!selectedIgreja) return;
    try {
      const { data, error: err } = await supabase
        .from('membros')
        .select('id, nome')
        .eq('id_igreja', selectedIgreja.id)
        .order('nome', { ascending: true });

      if (err) throw err;
      if (data) {
        setMembros(data);
      }
    } catch (e: any) {
      console.error('Erro ao buscar membros para líderes:', e);
    }
  }

  const handleEdit = (comunidade: Comunidade) => {
    setCurrentComunidade(comunidade);
    setIsEditing(true);
    setError('');
    setSuccess('');
    setSelectedAddMember('');
    if (comunidade.id) {
      fetchAssociatedMembers(comunidade.id);
    } else {
      setAssociatedMembers([]);
    }
  };

  const handleNew = () => {
    if (!selectedIgreja) {
      setError('Selecione uma igreja.');
      return;
    }
    setCurrentComunidade({
      id_igreja: selectedIgreja.id,
      nome: '',
      descricao: '',
      dia_reuniao: 'Quarta-feira',
      horario: '19:30',
      local: '',
      id_lider: '',
      id_segundo_lider: '',
      id_terceiro_lider: '',
      imagem_base64: '',
      imagem_nome: '',
      categoria: 'Adultos',
    });
    setAssociatedMembers([]);
    setSelectedAddMember('');
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = (id: string, nome: string) => {
    confirmDelete({
      message: `Deseja realmente excluir a comunidade/célula "${nome}"? Esta ação não poderá ser desfeita.`,
      onConfirm: async () => {
        try {
          const { error: err } = await supabase.from('comunidades').delete().eq('id', id);
          if (err) throw err;
          setSuccess('Comunidade excluída com sucesso!');
          fetchComunidades();
        } catch (e: any) {
          setError('Erro ao excluir comunidade: ' + (e.message || e));
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedIgreja) {
      setError('Selecione uma congregação.');
      return;
    }

    if (!currentComunidade.nome) {
      setError('O nome da comunidade é obrigatório.');
      return;
    }

    const payload = {
      id_igreja: selectedIgreja.id,
      nome: currentComunidade.nome,
      descricao: currentComunidade.descricao || null,
      dia_reuniao: currentComunidade.dia_reuniao || null,
      horario: currentComunidade.horario || null,
      local: currentComunidade.local || null,
      id_lider: currentComunidade.id_lider || null,
      id_segundo_lider: currentComunidade.id_segundo_lider || null,
      id_terceiro_lider: currentComunidade.id_terceiro_lider || null,
      imagem_base64: currentComunidade.imagem_base64 || null,
      imagem_nome: currentComunidade.imagem_nome || null,
      categoria: currentComunidade.categoria || null,
    };

    try {
      if (currentComunidade.id) {
        const { error: err } = await supabase
          .from('comunidades')
          .update(payload)
          .eq('id', currentComunidade.id);
        if (err) throw err;
        setSuccess('Comunidade atualizada com sucesso!');
      } else {
        const { error: err } = await supabase.from('comunidades').insert(payload);
        if (err) throw err;
        setSuccess('Comunidade cadastrada com sucesso!');
      }
      setIsEditing(false);
      fetchComunidades();
    } catch (e: any) {
      setError('Erro ao salvar comunidade: ' + (e.message || e));
    }
  };

  const filteredComunidades = comunidades.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.descricao && c.descricao.toLowerCase().includes(search.toLowerCase())) ||
    (c.lider && c.lider.nome.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-1">Células e Pequenos Grupos</p>
          <h2 className="text-3xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">Comunidades</h2>
          <p className="text-slate-500 text-sm">
            Grupos de crescimento e comunhão da congregação {selectedIgreja?.nome || ''}
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={handleNew}
            disabled={!selectedIgreja}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-md transition active:scale-95 text-sm uppercase tracking-wider"
          >
            <Plus size={18} />
            Nova Comunidade
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 font-bold text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 font-bold text-sm">
          {success}
        </div>
      )}

      {isEditing ? (
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-700 pb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {currentComunidade.id ? 'Editar Comunidade' : 'Criar Nova Comunidade / Célula'}
              </h3>
              <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Nome da Comunidade *
                </label>
                <input
                  type="text"
                  required
                  value={currentComunidade.nome || ''}
                  onChange={(e) => setCurrentComunidade({ ...currentComunidade, nome: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold text-sm"
                  placeholder="Ex. Comunidade Restauração"
                />
              </div>

              {/* c) Inserir Categorias no Combo com dados específicos */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Categoria da Comunidade
                </label>
                <select
                  value={currentComunidade.categoria || 'Adultos'}
                  onChange={(e) => setCurrentComunidade({ ...currentComunidade, categoria: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold text-sm cursor-pointer"
                >
                  <option value="Idoso">👴 Idoso</option>
                  <option value="Famílias">👨‍👩‍👧‍👦 Famílias</option>
                  <option value="Casais">💑 Casais</option>
                  <option value="Adultos">👥 Adultos</option>
                  <option value="Jovens">✨ Jovens</option>
                  <option value="Adolescentes">🎒 Adolescentes</option>
                  <option value="Crianças">🧸 Crianças</option>
                </select>
              </div>

              {/* a) Campos Segundo Lider e Terceiro Lider, recuperando do Cadastro de Membros */}
              <div className="md:col-span-2">
                <fieldset className="p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl space-y-4">
                  <legend className="px-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Liderança da Comunidade (Selecione do cadastro de membros)
                  </legend>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                        Líder Responsável
                      </label>
                      <select
                        value={currentComunidade.id_lider || ''}
                        onChange={(e) => setCurrentComunidade({ ...currentComunidade, id_lider: e.target.value || null })}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold cursor-pointer"
                      >
                        <option value="">Selecione...</option>
                        {membros.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                        Segundo Líder
                      </label>
                      <select
                        value={currentComunidade.id_segundo_lider || ''}
                        onChange={(e) => setCurrentComunidade({ ...currentComunidade, id_segundo_lider: e.target.value || null })}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold cursor-pointer"
                      >
                        <option value="">Selecione...</option>
                        {membros.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                        Terceiro Líder
                      </label>
                      <select
                        value={currentComunidade.id_terceiro_lider || ''}
                        onChange={(e) => setCurrentComunidade({ ...currentComunidade, id_terceiro_lider: e.target.value || null })}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold cursor-pointer"
                      >
                        <option value="">Selecione...</option>
                        {membros.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </fieldset>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Dia de Reunião
                </label>
                <select
                  value={currentComunidade.dia_reuniao || 'Quarta-feira'}
                  onChange={(e) => setCurrentComunidade({ ...currentComunidade, dia_reuniao: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold text-sm cursor-pointer"
                >
                  <option value="Segunda-feira">Segunda-feira</option>
                  <option value="Terça-feira">Terça-feira</option>
                  <option value="Quarta-feira">Quarta-feira</option>
                  <option value="Quinta-feira">Quinta-feira</option>
                  <option value="Sexta-feira">Sexta-feira</option>
                  <option value="Sábado">Sábado</option>
                  <option value="Domingo">Domingo</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Horário da Reunião
                </label>
                <input
                  type="text"
                  value={currentComunidade.horario || '19:30'}
                  onChange={(e) => setCurrentComunidade({ ...currentComunidade, horario: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold text-sm"
                  placeholder="Ex. 19:30 ou 20:00"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Local de Encontro
                </label>
                <input
                  type="text"
                  value={currentComunidade.local || ''}
                  onChange={(e) => setCurrentComunidade({ ...currentComunidade, local: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold text-sm"
                  placeholder="Residência do Irmão João ou Sala Principal do Templo"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Descrição da Comunidade
                </label>
                <textarea
                  value={currentComunidade.descricao || ''}
                  onChange={(e) => setCurrentComunidade({ ...currentComunidade, descricao: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold min-h-[100px] text-sm"
                  placeholder="Escreva sobre o propósito, o público-alvo ou os objetivos deste pequeno grupo..."
                />
              </div>

              {/* b) Inserir um Campo de Download da Imagem da Comunidade, Como utilizado no Cadastro de Mural de Avisos */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Imagem / Banner de Capa da Comunidade
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-dashed border-slate-205 dark:border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-950/40">
                    <p className="text-[11px] text-slate-500 mb-4 max-w-xs leading-relaxed">Arraste ou toque para fazer upload e salvar uma capa visual para sua célula.</p>
                    <label className="cursor-pointer bg-[#E4A232] hover:bg-[#E4A232]/90 hover:scale-[1.03] text-white font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition duration-150">
                      Selecionar Arquivo Imagem
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (loadEvt) => {
                              setCurrentComunidade(prev => ({
                                ...prev,
                                imagem_base64: loadEvt.target?.result as string,
                                imagem_nome: file.name
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    {currentComunidade.imagem_nome && (
                      <p className="text-[10px] text-emerald-600 font-bold mt-2 font-mono truncate max-w-xs">✓ {currentComunidade.imagem_nome}</p>
                    )}
                  </div>

                  <div className="border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/20 min-h-[140px]">
                    {currentComunidade.imagem_base64 ? (
                      <div className="text-center space-y-2 w-full">
                        <img
                          src={currentComunidade.imagem_base64}
                          alt="Prévia capa comunidade"
                          className="w-full h-24 object-cover rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mx-auto"
                        />
                        <div className="flex gap-4 justify-center items-center">
                          <a
                            href={currentComunidade.imagem_base64}
                            download={currentComunidade.imagem_nome || 'capa_comunidade.png'}
                            className="text-[10px] text-amber-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          >
                            ⬇️ Baixar Imagem
                          </a>
                          <button
                            type="button"
                            onClick={() => setCurrentComunidade(prev => ({ ...prev, imagem_base64: null, imagem_nome: null }))}
                            className="text-[10px] text-red-500 hover:underline font-bold cursor-pointer"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-450 italic">Nenhuma capa de imagem carregada para a comunidade</p>
                    )}
                  </div>
                </div>
              </div>

              {/* d) Criar uma Listagem de Membros para a Comunidade (Tabela com adição/remoção em tempo real) */}
              {currentComunidade.id ? (
                <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-700 pt-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-wide flex items-center gap-2">
                        <span>👥 Participantes da Comunidade</span>
                        <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 px-2 py-0.5 rounded-full">
                          {associatedMembers.length}
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">Adicione ou remova membros da congregação neste Pequeno Grupo.</p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={selectedAddMember}
                        onChange={(e) => setSelectedAddMember(e.target.value)}
                        className="px-3 py-2.5 text-xs rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-semibold cursor-pointer w-full sm:w-48"
                      >
                        <option value="">Selecione Membro...</option>
                        {membros.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddMember}
                        className="px-4 py-2.5 bg-[#E4A232] hover:bg-[#E4A232]/90 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition shrink-0 cursor-pointer"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>

                  {associatedMembers.length === 0 ? (
                    <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center text-xs text-slate-450 italic bg-slate-50 dark:bg-slate-950/20">
                      Nenhum membro vinculado a esta comunidade ainda. Use a caixa de seleção para adicionar novos participantes.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-150 dark:border-slate-850 rounded-2xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950/40 text-[10px] text-slate-450 font-black uppercase tracking-wider border-b border-slate-150 dark:border-slate-800/80">
                            <th className="p-3 pl-4">Membro Cadastrado</th>
                            <th className="p-3 text-right pr-4">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {associatedMembers.map((member) => (
                            <tr key={member.relationId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                              <td className="p-3 pl-4 font-bold">{member.nome}</td>
                              <td className="p-3 text-right pr-4">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(member.relationId)}
                                  className="text-red-500 hover:text-red-600 hover:underline font-bold text-xs uppercase tracking-wider cursor-pointer"
                                >
                                  Remover
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-700 pt-6">
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl text-xs text-amber-800 dark:text-amber-400 font-bold flex items-center gap-2">
                    <span>⚠️ Após Salvar o cadastro inicial desta comunidade, a listagem/tabela para vincular membros e participantes será ativada aqui automaticamente.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all uppercase text-xs tracking-wider cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 bg-[#E4A232] hover:bg-[#E4A232]/90 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md uppercase text-xs tracking-widest cursor-pointer"
              >
                <Save size={16} />
                Salvar Comunidade
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar comunidade, descrição ou líder..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-amber-500 transition-all text-xs font-semibold"
            />
          </div>

          {loading ? (
            <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-200 p-12 text-center text-slate-450 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin" />
              Carregando comunidades...
            </div>
          ) : filteredComunidades.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm p-12 text-center text-slate-500 font-medium">
              Nenhuma comunidade cadastrada na congregação.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredComunidades.map((c) => (
                <div key={c.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-all duration-300">
                  
                  {/* b) Colocar a Imagem na Visualização e incluir campo de Download como no Mural */}
                  {c.imagem_base64 ? (
                    <div className="relative w-full h-36 bg-slate-100 dark:bg-slate-950/50 border-b border-slate-205 dark:border-slate-800 overflow-hidden">
                      <img
                        src={c.imagem_base64}
                        alt={`capa_${c.nome}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <a
                          href={c.imagem_base64}
                          download={c.imagem_nome || 'capa.png'}
                          className="bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-wider py-1 px-2.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                        >
                          📥 Baixar Capa
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-12 bg-gradient-to-r from-amber-500/10 to-transparent dark:from-amber-500/5" />
                  )}

                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-wrap items-center gap-2">
                        {c.categoria && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-200/50 dark:border-amber-800/30">
                            {c.categoria}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition rounded-lg cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.nome)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition rounded-lg cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">{c.nome}</h4>
                      {c.descricao && (
                        <p className="text-xs text-slate-550 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">{c.descricao}</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-350">
                        <Calendar size={13} className="text-amber-600" />
                        <span>{c.dia_reuniao} às {c.horario}</span>
                      </div>
                      {c.local && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-350">
                          <MapPin size={13} className="text-slate-400" />
                          <span className="truncate">{c.local}</span>
                        </div>
                      )}

                      {/* Reuniões e Encontros button trigger */}
                      <button
                        type="button"
                        onClick={() => openMeetingsPanel(c)}
                        className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 bg-[#E4A232]/10 hover:bg-[#E4A232] text-[#E4A232] hover:text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition duration-200 cursor-pointer"
                      >
                        <Calendar size={12} />
                        📅 Reuniões e Presenças
                      </button>
                    </div>
                  </div>

                  {/* a) Criar os campos Segundo Lider e Terceiro Lider, recuperando do Cadastro de Membros */}
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border-t border-slate-105 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-400">
                      <span>Líder Responsável</span>
                      <span className="font-bold text-slate-900 dark:text-slate-200">{c.lider?.nome || 'Não definido'}</span>
                    </div>
                    {c.segundo_lider?.nome && (
                      <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-450 border-t border-slate-100/30 pt-1">
                        <span>Segundo Líder</span>
                        <span className="font-bold text-slate-800 dark:text-slate-300">{c.segundo_lider.nome}</span>
                      </div>
                    )}
                    {c.terceiro_lider?.nome && (
                      <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-455 border-t border-slate-100/30 pt-1">
                        <span>Terceiro Líder</span>
                        <span className="font-bold text-slate-800 dark:text-slate-300">{c.terceiro_lider.nome}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Meetings & Schedule Panel Modal */}
      {showMeetingsModal && selectedComunidadeForMeetings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-10 w-full max-w-3xl my-8 relative animate-in zoom-in-95 duration-250 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <button
              onClick={() => setShowMeetingsModal(false)}
              className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 cursor-pointer transition"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
              <Calendar className="text-[#E4A232]" size={24} />
              <div>
                <h2 className="text-sm font-black uppercase text-slate-900 dark:text-white leading-tight">
                  Gestão de Reuniões da Comunidade
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Grupo: {selectedComunidadeForMeetings.nome}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* 1. Schedule a new meeting centralized guidance info */}
              <div className="lg:col-span-12 xl:col-span-5 bg-gradient-to-br from-amber-500/5 to-amber-500/10 dark:from-amber-500/5 dark:to-amber-500/15 p-6 rounded-3xl border border-amber-500/20 shadow-sm h-fit space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-amber-500/20 pb-2.5 flex items-center gap-2">
                  <Calendar size={14} className="text-[#E4A232]" />
                  Agendamento de Reuniões
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                  Para manter a organização conceitual e a exibição integrada das atividades da igreja, <strong>o agendamento de reuniões e cultos domésticos deve ser realizado diretamente no Módulo de Agendas</strong>.
                </p>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-medium">
                  Qualquer evento agendado para este grupo celular através da Agenda carregará automaticamente a lista de presença e histórico dos participantes aqui.
                </p>

                <Link
                  href="/agenda"
                  className="w-full py-3 bg-[#E4A232] hover:bg-[#E4A232]/90 text-white font-black text-xs uppercase tracking-widest rounded-xl transition duration-150 hover:scale-[1.01] flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer text-center"
                >
                  <Calendar size={14} />
                  Ir para Módulo de Agendas
                </Link>
              </div>

              {/* 2. List of scheduled meetings */}
              <div className="lg:col-span-12 xl:col-span-7 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-250 border-b border-slate-200/45 dark:border-slate-800 pb-2">
                  📋 Histórico e Próximos Encontros
                </h3>

                {meetingsComunidade.length === 0 ? (
                  <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-xs text-slate-450 italic bg-slate-50 dark:bg-slate-950/10">
                    Nenhuma reunião agendada para esta comunidade celular ainda.
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
                    {meetingsComunidade.map((meet) => {
                      const mDate = new Date(meet.data_hora);
                      const formattedDateStr = mDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                      const formattedTimeStr = mDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={meet.id} className="p-4 bg-white dark:bg-slate-955 rounded-2xl border border-slate-150 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase leading-tight">
                              {meet.titulo}
                            </h4>
                            <p className="text-[10px] text-slate-450 font-bold">
                              📅 {formattedDateStr} às {formattedTimeStr}
                            </p>
                            {meet.local && (
                              <p className="text-[9px] text-slate-400 truncate max-w-xs font-semibold">
                                📍 {meet.local}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => openCommunityPresence(meet)}
                            className="px-3 py-1.5 bg-amber-500/10 hover:bg-[#E4A232] text-[#E4A232] hover:text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition duration-150 cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <ClipboardCheck size={11} />
                            Lista Chamada
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-150 dark:border-slate-800 mt-6">
              <button
                type="button"
                onClick={() => setShowMeetingsModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-150 hover:bg-slate-200 dark:bg-slate-850 dark:text-white text-slate-700 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Presence / Attendance Checklist Drawer Modal inside Comunidades Page */}
      {showPresMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-10 w-full max-w-md my-8 relative animate-in zoom-in-95 duration-250 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowPresMeetingModal(false)}
              className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 cursor-pointer transition"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
              <ClipboardCheck className="text-[#E4A232]" size={24} />
              <div>
                <h2 className="text-sm font-black uppercase text-slate-900 dark:text-white leading-tight">
                  Lista de Presença
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  {currentPresMeetingTitle}
                </p>
              </div>
            </div>

            {loadingPresence ? (
              <div className="flex flex-col items-center justify-center py-10">
                <RefreshCw className="animate-spin text-amber-500 mb-2" size={24} />
                <p className="text-xs text-slate-400 font-bold uppercase">Carregando membros da célula...</p>
              </div>
            ) : meetingPresenceList.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-slate-450 font-bold">Nenhum participante adicionado a este grupo celular ainda.</p>
                <p className="text-[9px] text-slate-400 mt-1">Feche e use a opção de adicionar membros no botão editar do card principal.</p>
              </div>
            ) : (
                <div className="space-y-4 mb-6 max-h-[45vh] overflow-y-auto pr-1">
                  <div className="flex justify-between items-center px-1 text-[10px] uppercase font-black tracking-wider text-slate-400">
                    <span>Membro da Célula</span>
                    <span>Presença</span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {meetingPresenceList.map((m, idx) => (
                      <div key={m.id_membro} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {m.nome}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...meetingPresenceList];
                              updated[idx].presente = true;
                              setMeetingPresenceList(updated);
                            }}
                            className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg border transition ${
                              m.presente
                                ? 'bg-emerald-50 border-emerald-350 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400'
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-500'
                            }`}
                          >
                            Presente
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...meetingPresenceList];
                              updated[idx].presente = false;
                              setMeetingPresenceList(updated);
                            }}
                            className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg border transition ${
                              !m.presente
                                ? 'bg-red-50 border-red-200 text-red-500 dark:bg-red-950/20 dark:border-red-900/30'
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-500'
                            }`}
                          >
                            Falta
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowPresMeetingModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Cancelar
              </button>
              {meetingPresenceList.length > 0 && (
                <button
                  type="button"
                  onClick={saveCommunityPresence}
                  disabled={savingPresence}
                  className="px-5 py-2.5 rounded-xl bg-[#E4A232] hover:bg-[#E4A232]/90 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/10 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Save size={12} />
                  {savingPresence ? 'Gravando...' : 'Salvar Chamada'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
