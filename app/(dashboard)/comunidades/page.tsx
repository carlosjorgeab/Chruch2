'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useIgreja } from '@/context/IgrejaContext';
import { useConfirm } from '@/context/ConfirmContext';
import { Plus, Edit2, Trash2, Save, X, Search, Users, Calendar, MapPin, RefreshCw, ClipboardCheck, Globe, Lock, Printer } from 'lucide-react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';

type Comunidade = {
  id: string;
  id_igreja: string;
  nome: string;
  descricao: string | null;
  dia_reuniao?: string | null;
  horario?: string | null;
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

  // Agenda popup states inside Comunidades Page
  const [showAgendaPopup, setShowAgendaPopup] = useState(false);
  const [agendaTitulo, setAgendaTitulo] = useState('');
  const [agendaStatus, setAgendaStatus] = useState<'Normal' | 'Importante' | 'Alerta'>('Normal');
  const [agendaPrivado, setAgendaPrivado] = useState(false);
  const [agendaDiaInteiro, setAgendaDiaInteiro] = useState(false);
  const [agendaLocal, setAgendaLocal] = useState('');
  const [agendaEvtDate, setAgendaEvtDate] = useState('');
  const [agendaEvtTime, setAgendaEvtTime] = useState('19:30');
  const [agendaEvtDateEnd, setAgendaEvtDateEnd] = useState('');
  const [agendaEvtTimeEnd, setAgendaEvtTimeEnd] = useState('21:30');
  const [agendaRecorrencia, setAgendaRecorrencia] = useState<'Único' | 'Diário' | 'Semanal' | 'Mensal' | 'Anual'>('Único');
  const [agendaSubmitting, setAgendaSubmitting] = useState(false);
  const [agendaError, setAgendaError] = useState('');

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
        .select(`
          *,
          reunioes!inner (
            id,
            id_comunidade
          )
        `)
        .eq('reunioes.id_comunidade', comunidadeId)
        .order('data_hora', { ascending: false });
      if (meetErr) throw meetErr;

      const mapped = (data || []).map((item: any) => {
        const reuniaoObj = Array.isArray(item.reunioes) ? item.reunioes[0] : item.reunioes;
        return {
          ...item,
          id_reuniao: reuniaoObj?.id || null
        };
      });
      setMeetingsComunidade(mapped);
    } catch (e) {
      console.error('Error fetching meetings:', e);
    }
  };

  const openMeetingsPanel = (com: Comunidade) => {
    setSelectedComunidadeForMeetings(com);
    setMeetingsComunidade([]);
    setShowMeetingsModal(true);
    fetchMeetings(com.id);
    setMeetingError('');
  };

  const openNewMeetingAgendaPopup = () => {
    if (!selectedComunidadeForMeetings) return;
    setAgendaTitulo(`Reunião ${selectedComunidadeForMeetings.nome}`);
    setAgendaStatus('Normal');
    setAgendaPrivado(false);
    setAgendaDiaInteiro(false);
    setAgendaLocal(selectedComunidadeForMeetings.local || '');
    
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    setAgendaEvtDate(todayString);
    setAgendaEvtTime('19:30');
    setAgendaEvtDateEnd(todayString);
    setAgendaEvtTimeEnd('21:30');
    
    setAgendaRecorrencia('Único');
    setAgendaSubmitting(false);
    setAgendaError('');
    
    setShowAgendaPopup(true);
  };

  const handleSaveAgendaPopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIgreja?.id || !selectedComunidadeForMeetings) return;

    if (!agendaTitulo.trim()) {
      setAgendaError('O nome da reunião é obrigatório.');
      return;
    }

    if (!agendaEvtDate || !agendaEvtTime) {
      setAgendaError('A data e o horário inicial são obrigatórios.');
      return;
    }

    if (!agendaDiaInteiro && (!agendaEvtDateEnd || !agendaEvtTimeEnd)) {
      setAgendaError('A data e o horário final são obrigatórios quando não for Dia Inteiro.');
      return;
    }

    try {
      setAgendaSubmitting(true);
      setAgendaError('');

      const startDateTimeString = `${agendaEvtDate}T${agendaEvtTime}:00`;
      const finalIsoStart = new Date(startDateTimeString).toISOString();

      let finalIsoEnd = null;
      if (agendaDiaInteiro) {
        const endDateTimeString = `${agendaEvtDate}T23:59:59`;
        finalIsoEnd = new Date(endDateTimeString).toISOString();
      } else {
        const endDateTimeString = `${agendaEvtDateEnd}T${agendaEvtTimeEnd}:00`;
        finalIsoEnd = new Date(endDateTimeString).toISOString();

        if (new Date(finalIsoStart) > new Date(finalIsoEnd)) {
          setAgendaError('A data e hora inicial não podem ser posteriores à data e hora final.');
          setAgendaSubmitting(false);
          return;
        }
      }

      const payloadsToInsert = [];
      let currentStartDate = new Date(finalIsoStart);
      let durationMs = 0;
      if (finalIsoEnd) {
        durationMs = new Date(finalIsoEnd).getTime() - new Date(finalIsoStart).getTime();
      }

      const limitDate = new Date(`${agendaEvtDateEnd}T23:59:59`);

      if (agendaRecorrencia === 'Único') {
        payloadsToInsert.push({
          id_igreja: selectedIgreja.id,
          titulo: agendaTitulo.trim(),
          data_hora: finalIsoStart,
          data_hora_fim: finalIsoEnd,
          dia_inteiro: agendaDiaInteiro,
          local: agendaLocal.trim() || null,
          privado: agendaPrivado,
          status: agendaStatus
        });
      } else {
        while (currentStartDate <= limitDate) {
          const currentEndDate = finalIsoEnd ? new Date(currentStartDate.getTime() + durationMs) : null;

          payloadsToInsert.push({
            id_igreja: selectedIgreja.id,
            titulo: agendaTitulo.trim(),
            data_hora: currentStartDate.toISOString(),
            data_hora_fim: currentEndDate ? currentEndDate.toISOString() : null,
            dia_inteiro: agendaDiaInteiro,
            local: agendaLocal.trim() || null,
            privado: agendaPrivado,
            status: agendaStatus
          });

          if (agendaRecorrencia === 'Diário') {
            currentStartDate.setDate(currentStartDate.getDate() + 1);
          } else if (agendaRecorrencia === 'Semanal') {
            currentStartDate.setDate(currentStartDate.getDate() + 7);
          } else if (agendaRecorrencia === 'Mensal') {
            currentStartDate.setMonth(currentStartDate.getMonth() + 1);
          } else if (agendaRecorrencia === 'Anual') {
            currentStartDate.setFullYear(currentStartDate.getFullYear() + 1);
          }
        }
      }

      // 1. Insert into agendas
      const { data: insertedData, error: postErr } = await supabase
        .from('agendas')
        .insert(payloadsToInsert)
        .select('id');

      if (postErr) throw postErr;

      // 2. Export automatically to the reunioes table
      if (insertedData && insertedData.length > 0) {
        const reunioesPayload = insertedData.map((item: any) => ({
          id_agenda: item.id,
          id_comunidade: selectedComunidadeForMeetings.id
        }));

        const { error: reunioesErr } = await supabase
          .from('reunioes')
          .upsert(reunioesPayload, { onConflict: 'id_agenda' });

        if (reunioesErr) {
          console.error('Error inserting into reunioes table:', reunioesErr);
        }
      }

      // 3. Refresh list of meetings
      fetchMeetings(selectedComunidadeForMeetings.id);

      // 4. Close the agenda scheduling popup
      setShowAgendaPopup(false);
    } catch (e: any) {
      console.error('Error saving agenda from community schedule:', e);
      setAgendaError('Erro ao salvar reunião: ' + e.message);
    } finally {
      setAgendaSubmitting(false);
    }
  };

  const openCommunityPresence = async (meeting: any) => {
    setCurrentPresMeetingId(meeting.id_reuniao);
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
        .eq('id_reuniao', meeting.id_reuniao);

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

  const generatePresencePDF = () => {
    const doc = new jsPDF();
    
    // Header section
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(228, 162, 50); // Amber brand color #E4A232
    doc.text("LISTA DE PRESENÇA", 14, 22);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    
    doc.text(`Célula / Comunidade: ${selectedComunidadeForMeetings?.nome || 'Não informada'}`, 14, 30);
    doc.text(`Reunião: ${currentPresMeetingTitle || 'Não informada'}`, 14, 36);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 14, 42);
    
    if (selectedComunidadeForMeetings?.descricao) {
      doc.text(`Descrição: ${selectedComunidadeForMeetings.descricao}`, 14, 48);
    }
    
    // Draw a horizontal line
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.5);
    doc.line(14, 53, 196, 53);
    
    // Table headers
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85); // Slate-700
    doc.text("Nome do Participante", 14, 62);
    doc.text("Status de Presença", 155, 62);
    
    // Table header line
    doc.setDrawColor(148, 163, 184); // Slate-400
    doc.line(14, 65, 196, 65);
    
    doc.setFont("Helvetica", "normal");
    let yPosition = 74;
    
    meetingPresenceList.forEach((m, index) => {
      // Page breaking logic
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 22;
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        doc.text("Nome do Participante", 14, yPosition);
        doc.text("Status de Presença", 155, yPosition);
        doc.line(14, yPosition + 3, 196, yPosition + 3);
        yPosition += 12;
        doc.setFont("Helvetica", "normal");
      }
      
      // Draw row content
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text(m.nome || 'Membro sem nome', 14, yPosition);
      
      const isPresent = m.presente;
      if (isPresent) {
        doc.setTextColor(16, 185, 129); // Emerald-500
        doc.setFont("Helvetica", "bold");
        doc.text("PRESENTE", 155, yPosition);
      } else {
        doc.setTextColor(239, 68, 68); // Red-500
        doc.setFont("Helvetica", "bold");
        doc.text("FALTA", 155, yPosition);
      }
      
      doc.setFont("Helvetica", "normal");
      
      // Light grey divider line
      doc.setDrawColor(241, 245, 249); // Slate-100
      doc.line(14, yPosition + 3, 196, yPosition + 3);
      
      yPosition += 10;
    });
    
    // Calculate attendance statistics
    const total = meetingPresenceList.length;
    const presentes = meetingPresenceList.filter(m => m.presente).length;
    const percentual = total > 0 ? Math.round((presentes / total) * 100) : 0;
    
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 22;
    } else {
      yPosition += 4;
    }
    
    // Statistics box background
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.rect(14, yPosition, 182, 26, "F");
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Total de Participantes: ${total}`, 20, yPosition + 10);
    doc.text(`Presentes: ${presentes}`, 90, yPosition + 10);
    doc.text(`Faltas: ${total - presentes}`, 150, yPosition + 10);
    
    doc.setFontSize(10);
    doc.setTextColor(228, 162, 50); // Amber brand
    doc.text(`Percentual de Frequência Geral da Reunião: ${percentual}%`, 20, yPosition + 19);
    
    // Footer signature spaces
    yPosition += 36;
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 50;
    }
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.line(14, yPosition, 90, yPosition);
    doc.line(120, yPosition, 196, yPosition);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text("Assinatura do Líder / Coordenador", 14, yPosition + 4);
    doc.text("Assinatura do Secretário / Apoio", 120, yPosition + 4);
    
    // Save PDF file
    const safeComName = (selectedComunidadeForMeetings?.nome || 'Celula').replace(/[^a-zA-Z0-0]+/g, '_');
    const safeMeetingName = (currentPresMeetingTitle || '').replace(/[^a-zA-Z0-0]+/g, '_');
    const filename = `Frequencia_${safeComName}_${safeMeetingName}.pdf`;
    doc.save(filename);
  };

  const saveCommunityPresence = async () => {
    if (!currentPresMeetingId) return;
    setSavingPresence(true);
    try {
      if (meetingPresenceList.length > 0) {
        const upserts = meetingPresenceList.map(item => ({
          id_reuniao: currentPresMeetingId,
          id_membro: item.id_membro,
          presente: item.presente
        }));

        const { error: upsertErr } = await supabase
          .from('chamada_reuniao')
          .upsert(upserts, { onConflict: 'id_reuniao,id_membro' });

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
              
              {/* 1. Schedule a new meeting through integrated Agenda Popup */}
              <div className="lg:col-span-12 xl:col-span-5 bg-gradient-to-br from-amber-500/5 to-amber-500/10 dark:from-amber-500/5 dark:to-amber-500/15 p-6 rounded-3xl border border-amber-500/20 shadow-sm h-fit space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-amber-500/20 pb-2.5 flex items-center gap-2">
                  <Calendar size={14} className="text-[#E4A232]" />
                  Agendar com Agenda Oficial
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                  Para máxima integração, o agendamento desta reunião celular criará automaticamente o evento na Agenda da igreja e gerará a lista de chamada para o grupo celular correspondente.
                </p>

                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-medium">
                  Use o botão abaixo para abrir o painel de criação de agendas integrado a esta comunidade celular.
                </p>

                <button
                  type="button"
                  onClick={openNewMeetingAgendaPopup}
                  className="w-full py-3 bg-[#E4A232] hover:bg-[#E4A232]/90 text-white font-black text-xs uppercase tracking-widest rounded-xl transition duration-150 hover:scale-[1.01] flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer text-center"
                >
                  <Plus size={14} />
                  Agendar Nova Reunião
                </button>
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

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
              <div className="flex items-center gap-3">
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

              {meetingPresenceList.length > 0 && (
                <button
                  type="button"
                  onClick={generatePresencePDF}
                  className="px-3 py-2 text-[9px] font-black uppercase tracking-wider text-[#E4A232] border border-[#E4A232]/30 hover:bg-[#E4A232]/5 rounded-xl transition flex items-center gap-1 cursor-pointer"
                  title="Gerar PDF para Impressão"
                >
                  <Printer size={12} />
                  Imprimir
                </button>
              )}
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
                <>
                  {/* Barra de progresso de presença visual */}
                  {(() => {
                    const totalMembros = meetingPresenceList.length;
                    const presentes = meetingPresenceList.filter(m => m.presente).length;
                    const percentualPresente = totalMembros > 0 ? Math.round((presentes / totalMembros) * 100) : 0;
                    return (
                      <div className="mb-6 p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                          <span className="uppercase tracking-wider text-[10px] text-slate-550 dark:text-slate-400">Percentual de Presença</span>
                          <span className="text-[#E4A232]">{percentualPresente}% ({presentes}/{totalMembros})</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${percentualPresente}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  <div className="presence-list-table space-y-4 mb-6 max-h-[45vh] overflow-y-auto pr-1">
                    <div className="flex justify-between items-center px-1 text-[10px] uppercase font-black tracking-wider text-slate-400">
                      <span>Membro da Célula</span>
                      <span>Presença</span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {meetingPresenceList.map((m, idx) => (
                      <motion.div 
                        key={`${m.id_membro}-${m.presente}`} 
                        initial={{ opacity: 0.5, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                      >
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
                      </motion.div>
                    ))}
                  </div>
                </div>
              </>
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

      {/* Popup de Agendamento da Agenda integrado ao Cadastro de Reunião da Comunidade */}
      {showAgendaPopup && selectedComunidadeForMeetings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-10 w-full max-w-lg my-8 relative animate-in zoom-in-95 duration-250 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <button
              onClick={() => setShowAgendaPopup(false)}
              className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 cursor-pointer transition"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
              <Calendar className="text-[#E4A232]" size={24} />
              <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Agendar Reunião via Agenda
              </h2>
            </div>

            {agendaError && (
              <div className="mb-4 p-4 text-xs font-bold uppercase rounded-2xl bg-red-50 dark:bg-red-950/20 text-red-600 border border-red-200/50 dark:border-red-900/40">
                ⚠️ {agendaError}
              </div>
            )}

            <form onSubmit={handleSaveAgendaPopup} className="space-y-6">
              
              {/* Visibilidade do Evento */}
              <div>
                <label className="block text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  Visibilidade do Evento
                </label>
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-50 dark:bg-slate-955 rounded-2xl border border-slate-100 dark:border-slate-850">
                  <button
                    type="button"
                    onClick={() => setAgendaPrivado(false)}
                    className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                      !agendaPrivado
                        ? 'bg-[#E4A232] text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <Globe size={14} />
                    🌍 Público
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgendaPrivado(true)}
                    className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                      agendaPrivado
                        ? 'bg-[#E4A232] text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <Lock size={14} />
                    🔒 Privado
                  </button>
                </div>
              </div>

              {/* Nome do Evento */}
              <div>
                <label className="block text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  Nome do Evento
                </label>
                <input
                  type="text"
                  required
                  value={agendaTitulo}
                  onChange={(e) => setAgendaTitulo(e.target.value)}
                  placeholder="Ex: Reunião Geral de Célula"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 dark:focus:border-amber-500 outline-none font-semibold transition animate-none"
                />
              </div>

              {/* Local / Endereço */}
              <div>
                <label className="block text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  📍 Local / Endereço (Texto Livre)
                </label>
                <input
                  type="text"
                  value={agendaLocal}
                  onChange={(e) => setAgendaLocal(e.target.value)}
                  placeholder="Ex: Templo Principal, Área Externa, Online via Zoom"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 dark:focus:border-amber-500 outline-none font-semibold transition"
                />
              </div>

              {/* Checkbox Dia Inteiro */}
              <div className="flex items-center gap-2 px-1 py-1 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 rounded-xl">
                <input
                  type="checkbox"
                  id="agenda_dia_inteiro_form"
                  checked={agendaDiaInteiro}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAgendaDiaInteiro(checked);
                    if (checked) {
                      setAgendaEvtDateEnd(agendaEvtDate);
                      setAgendaEvtTimeEnd('23:59');
                    }
                  }}
                  className="w-4 h-4 text-[#E4A232] border-slate-300 rounded focus:ring-amber-500 cursor-pointer accent-amber-500"
                />
                <label 
                  htmlFor="agenda_dia_inteiro_form" 
                  className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide cursor-pointer select-none"
                >
                  ⏰ Evento do Dia Inteiro
                </label>
              </div>

              {/* Data Inicial e Horário Inicial */}
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
                      value={agendaEvtDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAgendaEvtDate(val);
                        if (agendaDiaInteiro) {
                          setAgendaEvtDateEnd(val);
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-semibold transition text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1">
                      Horário Inicial
                    </label>
                    <input
                      type="time"
                      required
                      value={agendaEvtTime}
                      onChange={(e) => setAgendaEvtTime(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-semibold transition text-xs"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Data Final e Horário Final */}
              <fieldset className={`p-4 border-2 border-slate-100 dark:border-slate-850 rounded-2xl space-y-4 transition ${agendaDiaInteiro ? 'opacity-40 pointer-events-none' : ''}`}>
                <legend className="px-2 text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                  Fim do Evento {!agendaDiaInteiro ? '' : '(Bloqueado por Dia Inteiro)'}
                </legend>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1">
                      Data Final
                    </label>
                    <input
                      type="date"
                      required={!agendaDiaInteiro}
                      disabled={agendaDiaInteiro}
                      value={agendaDiaInteiro ? agendaEvtDate : agendaEvtDateEnd}
                      onChange={(e) => setAgendaEvtDateEnd(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-semibold transition text-xs disabled:bg-slate-100 dark:disabled:bg-slate-900/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1">
                      Horário Final
                    </label>
                    <input
                      type="time"
                      required={!agendaDiaInteiro}
                      disabled={agendaDiaInteiro}
                      value={agendaDiaInteiro ? '23:59' : agendaEvtTimeEnd}
                      onChange={(e) => setAgendaEvtTimeEnd(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-semibold transition text-xs disabled:bg-slate-100 dark:disabled:bg-slate-900/50"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Status / Prioridade */}
              <div>
                <label className="block text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  Status / Prioridade
                </label>
                <select
                  value={agendaStatus}
                  onChange={(e) => setAgendaStatus(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-semibold transition cursor-pointer text-xs"
                >
                  <option value="Normal">Normal (Azul)</option>
                  <option value="Importante">Importante (Vermelho)</option>
                  <option value="Alerta">Alerta (Amarelo)</option>
                </select>
              </div>

              {/* Recorrência */}
              <div>
                <label className="block text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  🔁 Recorrência / Repetição de Agendas
                </label>
                <select
                  value={agendaRecorrencia}
                  onChange={(e) => setAgendaRecorrencia(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-semibold transition cursor-pointer text-xs"
                >
                  <option value="Único">Único (Sem repetição)</option>
                  <option value="Diário">Diário (Duplica todo dia até Data Final)</option>
                  <option value="Semanal">Semanal (Duplica toda semana até Data Final)</option>
                  <option value="Mensal">Mensal (Duplica todo mês até Data Final)</option>
                  <option value="Anual">Anual (Duplica todo ano até Data Final)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
                  Escolha um período se deseja criar uma série de reuniões repetidas automaticamente da Data Inicial até a Data Final na Agenda Oficial e replicadas como encontros celulares.
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAgendaPopup(false)}
                  className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={agendaSubmitting}
                  className="px-6 py-3 rounded-xl bg-[#E4A232] hover:bg-[#E4A232]/90 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/10 flex items-center gap-2 transition cursor-pointer"
                >
                  <Save size={14} />
                  {agendaSubmitting ? 'Salvando...' : 'Confirmar Agenda e Ligar Reunião'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
