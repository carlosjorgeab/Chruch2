'use client';

import { useState, useEffect, useRef } from 'react';
import { useIgreja } from '@/context/IgrejaContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Baby, Users, DoorOpen, Plus, Trash2, Calendar, Edit3, Check, X, 
  UploadCloud, ArrowRight, UserCheck, Smile, HelpCircle, QrCode, AlertCircle,
  Activity, Heart, ShieldAlert, Phone, User, Info, FileText, Printer
} from 'lucide-react';

interface TurmaMembro {
  id_membro: string;
  nome_membro: string;
  cargo: 'Lider' | 'Coordenador' | 'Supervisor' | 'Professor' | 'Auxiliar' | 'Monitor' | 'Recepcionista' | 'Berçario' | 'Voluntário' | 'Segurança' | 'Apoio';
}

interface Turma {
  id: string;
  nome: string;
  idade_minima: number;
  idade_maxima: number;
  capacidade: number;
  tipo_entrada: 'Link Público' | 'Manual' | 'Automático';
  imagem_url: string;
  membros: TurmaMembro[];
}

interface Programacao {
  id: string;
  descricao: string;
  data_hora: string;
  id_agenda?: string;
}

interface Sala {
  id: string;
  id_turma: string;
  nome: string;
  idade_minima: number;
  idade_maxima: number;
  capacidade: number;
  status: 'Fechado' | 'Aberto' | 'Encerrado';
  programacao: Programacao[];
}

interface SalaCrianca {
  id: string;
  id_sala: string;
  tipo_crianca: 'Membro' | 'Visitante';
  id_membro: string | null;
  nome_visitante: string | null;
  created_at: string;
  nome_responsavel: string;
  telefone_responsavel: string;
  data_nascimento: string;
  sexo: 'Masculino' | 'Feminino';
  necessidades_especiais?: string;
  restricoes_alimentares?: string;
  observacoes_medicas?: string;
  autoriza_imagem: boolean;
  foto_url?: string;
}

export default function KidsModule() {
  const { selectedIgreja } = useIgreja();
  const { user, hasPermission } = useAuth();

  // Core authorization checks
  const isMasterOrAdmin = user?.id_master || user?.is_admin;
  const userPerms = user?.perfil?.permissoes || [];
  const canAccessPainel = isMasterOrAdmin || userPerms.includes('/kids');
  const canAccessTurmas = isMasterOrAdmin || userPerms.includes('/kids/turmas');
  const canAccessSalas = isMasterOrAdmin || userPerms.includes('/kids/salas');

  // Active Tab: 'painel' | 'turmas' | 'salas'
  const [activeTab, setActiveTab] = useState<'painel' | 'turmas' | 'salas'>('painel');

  // Core Data Lists
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [membrosIgreja, setMembrosIgreja] = useState<any[]>([]);
  const [criancasSala, setCriancasSala] = useState<SalaCrianca[]>([]);

  // Loading States
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  // Drag and Drop State for Upload
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Painel Operation Selection State
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  const [selectedSalaId, setSelectedSalaId] = useState<string>('');
  const [isSalaAbertaOperator, setIsSalaAbertaOperator] = useState<boolean>(false);

  // Form States - Turma
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [showTurmaForm, setShowTurmaForm] = useState<boolean>(false);
  const [turmaNome, setTurmaNome] = useState<string>('');
  const [turmaIdadeMin, setTurmaIdadeMin] = useState<number>(0);
  const [turmaIdadeMax, setTurmaIdadeMax] = useState<number>(12);
  const [turmaCapacidade, setTurmaCapacidade] = useState<number>(15);
  const [turmaTipoEntrada, setTurmaTipoEntrada] = useState<'Link Público' | 'Manual' | 'Automático'>('Manual');
  const [turmaImagemUrl, setTurmaImagemUrl] = useState<string>('');
  const [turmaMembros, setTurmaMembros] = useState<TurmaMembro[]>([]);

  // Member select for Turma
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedMemberCargo, setSelectedMemberCargo] = useState<TurmaMembro['cargo']>('Professor');

  // Form States - Sala
  const [editingSala, setEditingSala] = useState<Sala | null>(null);
  const [showSalaForm, setShowSalaForm] = useState<boolean>(false);
  const [salaNome, setSalaNome] = useState<string>('');
  const [salaTurmaId, setSalaTurmaId] = useState<string>('');
  const [salaIdadeMin, setSalaIdadeMin] = useState<number>(0);
  const [salaIdadeMax, setSalaIdadeMax] = useState<number>(12);
  const [salaCapacidade, setSalaCapacidade] = useState<number>(15);
  const [salaStatus, setSalaStatus] = useState<Sala['status']>('Fechado');

  // Programação Modal State
  const [programacaoSala, setProgramacaoSala] = useState<Sala | null>(null);
  const [progDescricao, setProgDescricao] = useState<string>('');
  const [progDataHora, setProgDataHora] = useState<string>('');

  // Add Children to Active Room State
  const [addChildTipo, setAddChildTipo] = useState<'Membro' | 'Visitante'>('Membro');
  const [addChildMembroId, setAddChildMembroId] = useState<string>('');
  const [addChildNomeVisitante, setAddChildNomeVisitante] = useState<string>('');
  
  // New Kids Module form fields
  const [addChildNomeResponsavel, setAddChildNomeResponsavel] = useState<string>('');
  const [addChildTelefoneResponsavel, setAddChildTelefoneResponsavel] = useState<string>('');
  const [addChildDataNascimento, setAddChildDataNascimento] = useState<string>('');
  const [addChildSexo, setAddChildSexo] = useState<'Masculino' | 'Feminino'>('Masculino');
  const [addChildNecessidades, setAddChildNecessidades] = useState<string>('');
  const [addChildRestricoes, setAddChildRestricoes] = useState<string>('');
  const [addChildObservacoesMedicas, setAddChildObservacoesMedicas] = useState<string>('');
  const [addChildAutorizaImagem, setAddChildAutorizaImagem] = useState<boolean>(false);
  const [addChildFotoUrl, setAddChildFotoUrl] = useState<string>('');

  // Badges and QR code previews for children in room
  const [selectedChildForBadge, setSelectedChildForBadge] = useState<SalaCrianca | null>(null);
  const [selectedChildForQr, setSelectedChildForQr] = useState<SalaCrianca | null>(null);

  // Auto populate member child details
  useEffect(() => {
    if (addChildTipo === 'Membro' && addChildMembroId) {
      const found = membrosIgreja.find(m => m.id === addChildMembroId);
      if (found) {
        setAddChildDataNascimento(found.data_nascimento || '');
        setAddChildSexo(found.sexo === 'Masculino' || found.sexo === 'Feminino' ? found.sexo : 'Masculino');
        setAddChildFotoUrl(found.foto_url || '');
      }
    }
  }, [addChildMembroId, addChildTipo, membrosIgreja]);

  // Child Search Autocomplete state
  const [searchChildQuery, setSearchChildQuery] = useState<string>('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState<boolean>(false);

  // Alert/Notification State
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Auto-redirect active tab based on permissions
  useEffect(() => {
    if (!canAccessPainel) {
      if (canAccessTurmas) {
        setActiveTab('turmas');
      } else if (canAccessSalas) {
        setActiveTab('salas');
      }
    }
  }, [canAccessPainel, canAccessTurmas, canAccessSalas]);

  // Load database items on start or when church changes
  useEffect(() => {
    if (selectedIgreja?.id && (canAccessPainel || canAccessTurmas || canAccessSalas)) {
      loadAllData();
    }
  }, [selectedIgreja, canAccessPainel, canAccessTurmas, canAccessSalas]);

  // Load data from DB via configuracoes_sistema
  const loadAllData = async () => {
    if (!selectedIgreja?.id) return;
    setLoading(true);
    try {
      // 1. Load Membros list for selectors
      const { data: members, error: memError } = await supabase
        .from('membros')
        .select('id, nome, categoria, foto_url, data_nascimento, sexo')
        .eq('id_igreja', selectedIgreja.id)
        .order('nome', { ascending: true });

      if (memError) throw memError;
      setMembrosIgreja(members || []);

      // 2. Load Turmas from configuracoes_sistema
      const { data: configTurmas, error: tError } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', `kids_turmas_${selectedIgreja.id}`)
        .maybeSingle();

      let loadedTurmas: Turma[] = [];
      if (configTurmas?.valor) {
        try {
          loadedTurmas = JSON.parse(configTurmas.valor);
          setTurmas(loadedTurmas);
        } catch (e) {
          console.error('Error parsing turmas JSON:', e);
        }
      } else {
        setTurmas([]);
      }

      // 3. Load Salas from configuracoes_sistema
      const { data: configSalas, error: sError } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', `kids_salas_${selectedIgreja.id}`)
        .maybeSingle();

      let loadedSalas: Sala[] = [];
      if (configSalas?.valor) {
        try {
          loadedSalas = JSON.parse(configSalas.valor);
          setSalas(loadedSalas);
        } catch (e) {
          console.error('Error parsing salas JSON:', e);
        }
      } else {
        setSalas([]);
      }

      // 4. Load Children check-in records from configuracoes_sistema
      const { data: configCriancas, error: cError } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', `kids_sala_criancas_${selectedIgreja.id}`)
        .maybeSingle();

      if (configCriancas?.valor) {
        try {
          setCriancasSala(JSON.parse(configCriancas.valor));
        } catch (e) {
          console.error('Error parsing children records JSON:', e);
        }
      } else {
        setCriancasSala([]);
      }

      // 5. Check if we had an open Sala session saved in localStorage
      const cachedSalaId = localStorage.getItem(`kids_active_sala_${selectedIgreja.id}`);
      if (cachedSalaId && loadedSalas.some(s => s.id === cachedSalaId && s.status === 'Aberto')) {
        const foundSala = loadedSalas.find(s => s.id === cachedSalaId);
        if (foundSala) {
          setSelectedTurmaId(foundSala.id_turma);
          setSelectedSalaId(foundSala.id);
          setIsSalaAbertaOperator(true);
        }
      }

    } catch (err: any) {
      console.error('Error loading Kids data:', err);
      showNotification('Erro ao carregar os dados do Kids.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 5000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  // Save Turmas to cloud DB
  const saveTurmasToDb = async (updatedTurmas: Turma[]) => {
    if (!selectedIgreja?.id) return;
    try {
      const { error } = await supabase
        .from('configuracoes_sistema')
        .upsert({
          chave: `kids_turmas_${selectedIgreja.id}`,
          valor: JSON.stringify(updatedTurmas),
          descricao: `Turmas do módulo Kids da igreja ${selectedIgreja.nome}`
        }, { onConflict: 'chave' });

      if (error) throw error;
      setTurmas(updatedTurmas);
      showNotification('Turmas salvas com sucesso no servidor!', 'success');
    } catch (err: any) {
      console.error('Error saving turmas:', err);
      showNotification('Erro ao salvar as turmas no banco de dados.', 'error');
    }
  };

  // Save Salas to cloud DB
  const saveSalasToDb = async (updatedSalas: Sala[]) => {
    if (!selectedIgreja?.id) return;
    try {
      const { error } = await supabase
        .from('configuracoes_sistema')
        .upsert({
          chave: `kids_salas_${selectedIgreja.id}`,
          valor: JSON.stringify(updatedSalas),
          descricao: `Salas do módulo Kids da igreja ${selectedIgreja.nome}`
        }, { onConflict: 'chave' });

      if (error) throw error;
      setSalas(updatedSalas);
      showNotification('Salas salvas com sucesso no servidor!', 'success');
    } catch (err: any) {
      console.error('Error saving salas:', err);
      showNotification('Erro ao salvar as salas no banco de dados.', 'error');
    }
  };

  // Save Children check-in records to cloud DB
  const saveChildrenToDb = async (updatedCriancas: SalaCrianca[]) => {
    if (!selectedIgreja?.id) return;
    try {
      const { error } = await supabase
        .from('configuracoes_sistema')
        .upsert({
          chave: `kids_sala_criancas_${selectedIgreja.id}`,
          valor: JSON.stringify(updatedCriancas),
          descricao: `Presenças de crianças nas salas da igreja ${selectedIgreja.nome}`
        }, { onConflict: 'chave' });

      if (error) throw error;
      setCriancasSala(updatedCriancas);
    } catch (err: any) {
      console.error('Error saving checked-in children:', err);
      showNotification('Erro ao salvar a lista de crianças no banco de dados.', 'error');
    }
  };

  // -------------------------------------------------------------
  // TURMA SUB-MODULE METHODS
  // -------------------------------------------------------------
  const handleOpenNewTurma = () => {
    setEditingTurma(null);
    setTurmaNome('');
    setTurmaIdadeMin(0);
    setTurmaIdadeMax(12);
    setTurmaCapacidade(15);
    setTurmaTipoEntrada('Manual');
    setTurmaImagemUrl('');
    setTurmaMembros([]);
    setShowTurmaForm(true);
  };

  const handleOpenEditTurma = (turma: Turma) => {
    setEditingTurma(turma);
    setTurmaNome(turma.nome);
    setTurmaIdadeMin(turma.idade_minima);
    setTurmaIdadeMax(turma.idade_maxima);
    setTurmaCapacidade(turma.capacidade);
    setTurmaTipoEntrada(turma.tipo_entrada);
    setTurmaImagemUrl(turma.imagem_url || '');
    setTurmaMembros(turma.membros || []);
    setShowTurmaForm(true);
  };

  const handleSaveTurma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaNome.trim()) {
      showNotification('Por favor, informe o nome da turma.', 'error');
      return;
    }

    setSaving(true);
    try {
      let updatedTurmasList = [...turmas];

      if (editingTurma) {
        // Edit Mode
        updatedTurmasList = updatedTurmasList.map(t => {
          if (t.id === editingTurma.id) {
            return {
              ...t,
              nome: turmaNome,
              idade_minima: turmaIdadeMin,
              idade_maxima: turmaIdadeMax,
              capacidade: turmaCapacidade,
              tipo_entrada: turmaTipoEntrada,
              imagem_url: turmaImagemUrl,
              membros: turmaMembros
            };
          }
          return t;
        });
      } else {
        // Create Mode
        const newTurma: Turma = {
          id: crypto.randomUUID(),
          nome: turmaNome,
          idade_minima: turmaIdadeMin,
          idade_maxima: turmaIdadeMax,
          capacidade: turmaCapacidade,
          tipo_entrada: turmaTipoEntrada,
          imagem_url: turmaImagemUrl,
          membros: turmaMembros
        };
        updatedTurmasList.push(newTurma);
      }

      await saveTurmasToDb(updatedTurmasList);
      setShowTurmaForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTurma = async (turmaId: string) => {
    if (!confirm('Deseja realmente excluir esta turma? Todas as salas vinculadas a ela serão afetadas.')) return;
    try {
      const updatedTurmasList = turmas.filter(t => t.id !== turmaId);
      const updatedSalas = salas.filter(s => s.id_turma !== turmaId);
      
      await saveTurmasToDb(updatedTurmasList);
      await saveSalasToDb(updatedSalas);
    } catch (err) {
      console.error(err);
    }
  };

  // Add Member to Turma members list
  const handleAddTurmaMembro = () => {
    if (!selectedMemberId) {
      showNotification('Selecione um membro da igreja.', 'error');
      return;
    }
    const memberObj = membrosIgreja.find(m => m.id === selectedMemberId);
    if (!memberObj) return;

    if (turmaMembros.some(m => m.id_membro === selectedMemberId)) {
      showNotification('Este membro já foi adicionado com um cargo para esta turma.', 'error');
      return;
    }

    const newMembro: TurmaMembro = {
      id_membro: selectedMemberId,
      nome_membro: memberObj.nome,
      cargo: selectedMemberCargo
    };

    setTurmaMembros([...turmaMembros, newMembro]);
    setSelectedMemberId('');
  };

  const handleRemoveTurmaMembro = (membroId: string) => {
    setTurmaMembros(turmaMembros.filter(m => m.id_membro !== membroId));
  };

  // Upload Cover Image handler
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/financeiro/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Erro inesperado no servidor de upload.');
      }

      setTurmaImagemUrl(result.url);
      showNotification('Capa carregada com sucesso!', 'success');
    } catch (err: any) {
      console.error(err);
      showNotification(`Erro no upload da imagem: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // -------------------------------------------------------------
  // SALAS SUB-MODULE METHODS
  // -------------------------------------------------------------
  const handleOpenNewSala = () => {
    setEditingSala(null);
    setSalaNome('');
    setSalaTurmaId('');
    setSalaIdadeMin(0);
    setSalaIdadeMax(12);
    setSalaCapacidade(15);
    setSalaStatus('Fechado');
    setShowSalaForm(true);
  };

  const handleOpenEditSala = (sala: Sala) => {
    setEditingSala(sala);
    setSalaNome(sala.nome);
    setSalaTurmaId(sala.id_turma);
    setSalaIdadeMin(sala.idade_minima);
    setSalaIdadeMax(sala.idade_maxima);
    setSalaCapacidade(sala.capacidade);
    setSalaStatus(sala.status);
    setShowSalaForm(true);
  };

  // When choosing a Turma in the Sala form, pre-load the default age / capacity limits of that Turma
  const handleSelectTurmaForSala = (turmaId: string) => {
    setSalaTurmaId(turmaId);
    const foundTurma = turmas.find(t => t.id === turmaId);
    if (foundTurma) {
      setSalaIdadeMin(foundTurma.idade_minima);
      setSalaIdadeMax(foundTurma.idade_maxima);
      setSalaCapacidade(foundTurma.capacidade);
    }
  };

  const handleSaveSala = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaNome.trim()) {
      showNotification('Informe o nome da sala.', 'error');
      return;
    }
    if (!salaTurmaId) {
      showNotification('Selecione uma turma para vincular esta sala.', 'error');
      return;
    }

    setSaving(true);
    try {
      let updatedSalas = [...salas];

      if (editingSala) {
        updatedSalas = updatedSalas.map(s => {
          if (s.id === editingSala.id) {
            return {
              ...s,
              nome: salaNome,
              id_turma: salaTurmaId,
              idade_minima: salaIdadeMin,
              idade_maxima: salaIdadeMax,
              capacidade: salaCapacidade,
              status: salaStatus
            };
          }
          return s;
        });
      } else {
        const newSala: Sala = {
          id: crypto.randomUUID(),
          id_turma: salaTurmaId,
          nome: salaNome,
          idade_minima: salaIdadeMin,
          idade_maxima: salaIdadeMax,
          capacidade: salaCapacidade,
          status: salaStatus,
          programacao: []
        };
        updatedSalas.push(newSala);
      }

      await saveSalasToDb(updatedSalas);
      setShowSalaForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSala = async (salaId: string) => {
    if (!confirm('Deseja realmente excluir esta sala?')) return;
    try {
      const updatedSalas = salas.filter(s => s.id !== salaId);
      const updatedCriancas = criancasSala.filter(c => c.id_sala !== salaId);
      
      await saveSalasToDb(updatedSalas);
      await saveChildrenToDb(updatedCriancas);
      
      if (selectedSalaId === salaId) {
        setIsSalaAbertaOperator(false);
        setSelectedSalaId('');
        localStorage.removeItem(`kids_active_sala_${selectedIgreja?.id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------------------------------
  // PROGRAMAÇÃO & AGENDA INTEGRATION METHODS
  // -------------------------------------------------------------
  const handleOpenProgramacao = (sala: Sala) => {
    setProgramacaoSala(sala);
    setProgDescricao('');
    // Default data_hora to today plus 1 hour
    const date = new Date();
    date.setHours(date.getHours() + 1);
    date.setMinutes(0);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset*60*1000));
    setProgDataHora(localDate.toISOString().slice(0, 16));
  };

  const handleAddProgramacao = async () => {
    if (!programacaoSala || !progDescricao.trim() || !progDataHora) {
      showNotification('Preencha a descrição e a data/hora da programação.', 'error');
      return;
    }

    const newProgItem: Programacao = {
      id: crypto.randomUUID(),
      descricao: progDescricao,
      data_hora: progDataHora
    };

    const updatedSalas = salas.map(s => {
      if (s.id === programacaoSala.id) {
        return {
          ...s,
          programacao: [...(s.programacao || []), newProgItem]
        };
      }
      return s;
    });

    try {
      await saveSalasToDb(updatedSalas);
      const updatedSalaObj = updatedSalas.find(s => s.id === programacaoSala.id);
      if (updatedSalaObj) {
        setProgramacaoSala(updatedSalaObj);
      }
      setProgDescricao('');
      showNotification('Programação adicionada à sala!', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveProgramacao = async (progId: string) => {
    if (!programacaoSala) return;

    const updatedSalas = salas.map(s => {
      if (s.id === programacaoSala.id) {
        return {
          ...s,
          programacao: (s.programacao || []).filter(p => p.id !== progId)
        };
      }
      return s;
    });

    try {
      await saveSalasToDb(updatedSalas);
      const updatedSalaObj = updatedSalas.find(s => s.id === programacaoSala.id);
      if (updatedSalaObj) {
        setProgramacaoSala(updatedSalaObj);
      }
      showNotification('Programação removida com sucesso.', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Sync / create an entry in the main Church Agenda for this programacao
  const handleSyncWithMainAgenda = async (progItem: Programacao) => {
    if (!selectedIgreja || !programacaoSala) return;

    try {
      // 1. Create event inside the church's 'agendas' table
      const { data: agendaData, error: agendaError } = await supabase
        .from('agendas')
        .insert({
          id_igreja: selectedIgreja.id,
          titulo: `[Kids - ${programacaoSala.nome}] ${progItem.descricao}`,
          data_hora: new Date(progItem.data_hora).toISOString(),
          status: 'Normal',
          local: `Sala Kids: ${programacaoSala.nome}`,
          privado: false
        })
        .select()
        .single();

      if (agendaError) throw agendaError;

      // 2. Save the agenda link id inside our programming entry
      const updatedSalas = salas.map(s => {
        if (s.id === programacaoSala.id) {
          const updatedProgs = s.programacao.map(p => {
            if (p.id === progItem.id) {
              return { ...p, id_agenda: agendaData.id };
            }
            return p;
          });
          return { ...s, programacao: updatedProgs };
        }
        return s;
      });

      await saveSalasToDb(updatedSalas);
      const updatedSalaObj = updatedSalas.find(s => s.id === programacaoSala.id);
      if (updatedSalaObj) {
        setProgramacaoSala(updatedSalaObj);
      }
      showNotification('Programação agendada com sucesso no calendário oficial da igreja!', 'success');
    } catch (err: any) {
      console.error('Error syncing with agenda:', err);
      showNotification('Erro ao criar agendamento na agenda oficial da igreja.', 'error');
    }
  };

  // -------------------------------------------------------------
  // KIDS DASHBOARD PANEL (OPERAÇÃO / SALA ABERTA) METHODS
  // -------------------------------------------------------------
  const handleAbrirSala = async () => {
    if (!selectedSalaId) {
      showNotification('Selecione a sala que deseja abrir.', 'error');
      return;
    }

    const currentSala = salas.find(s => s.id === selectedSalaId);
    if (!currentSala) return;

    // Update status to 'Aberto' inside the DB list
    const updatedSalas = salas.map(s => {
      if (s.id === selectedSalaId) {
        return { ...s, status: 'Aberto' as const };
      }
      return s;
    });

    try {
      await saveSalasToDb(updatedSalas);
      setIsSalaAbertaOperator(true);
      localStorage.setItem(`kids_active_sala_${selectedIgreja?.id}`, selectedSalaId);
      showNotification(`Sala ${currentSala.nome} foi aberta com sucesso para atendimento!`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleFecharSala = async () => {
    if (!selectedSalaId) return;
    if (!confirm('Deseja realmente fechar esta sala? O status passará para "Fechado".')) return;

    const updatedSalas = salas.map(s => {
      if (s.id === selectedSalaId) {
        return { ...s, status: 'Fechado' as const };
      }
      return s;
    });

    try {
      await saveSalasToDb(updatedSalas);
      setIsSalaAbertaOperator(false);
      localStorage.removeItem(`kids_active_sala_${selectedIgreja?.id}`);
      showNotification('Sala foi encerrada para atendimento.', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangeSalaStatus = async (salaId: string, newStatus: 'Aberto' | 'Fechado' | 'Encerrado') => {
    const updatedSalas = salas.map(s => {
      if (s.id === salaId) {
        return { ...s, status: newStatus };
      }
      return s;
    });

    try {
      await saveSalasToDb(updatedSalas);
      showNotification(`Status da sala alterado para "${newStatus}" com sucesso!`, 'success');
    } catch (err: any) {
      console.error(err);
      showNotification('Erro ao alterar status da sala.', 'error');
    }
  };

  // Helper to calculate age from birth date dynamically
  const getAgeFromBirthDate = (birthDateStr: string): string => {
    if (!birthDateStr) return '0';
    const birthDate = new Date(birthDateStr + 'T00:00:00');
    if (isNaN(birthDate.getTime())) return '0';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age < 0 ? '0' : String(age);
  };

  // Upload handler specifically for Child Photo (using existing api route)
  const handleChildPhotoUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/financeiro/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Erro inesperado no servidor de upload.');
      }

      setAddChildFotoUrl(result.url);
      showNotification('Foto da criança carregada com sucesso!', 'success');
    } catch (err: any) {
      console.error(err);
      showNotification(`Erro no upload da foto: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Add child to the currently open Room with all detailed fields
  const handleAddCriancaToSala = async () => {
    if (!selectedSalaId) {
      showNotification('Selecione ou abra uma sala primeiro.', 'error');
      return;
    }

    const currentSala = salas.find(s => s.id === selectedSalaId);
    if (!currentSala) return;

    // Calculate current occupancy
    const currentCount = criancasSala.filter(c => c.id_sala === selectedSalaId).length;
    if (currentCount >= currentSala.capacidade) {
      if (!confirm('A capacidade máxima da sala já foi atingida. Deseja adicionar mesmo assim?')) {
        return;
      }
    }

    // Common and specific validations
    if (!addChildNomeResponsavel.trim()) {
      showNotification('Informe o Nome do Responsável.', 'error');
      return;
    }
    if (!addChildTelefoneResponsavel.trim()) {
      showNotification('Informe o Telefone de Contato do Responsável.', 'error');
      return;
    }
    if (!addChildDataNascimento) {
      showNotification('Informe a Data de Nascimento da criança.', 'error');
      return;
    }

    let newCheckIn: SalaCrianca;

    if (addChildTipo === 'Membro') {
      if (!addChildMembroId) {
        showNotification('Selecione a criança cadastrada na igreja.', 'error');
        return;
      }

      // Check if child is already checked in to this active room
      if (criancasSala.some(c => c.id_membro === addChildMembroId && c.id_sala === selectedSalaId)) {
        showNotification('Esta criança já está adicionada nesta sala.', 'error');
        return;
      }

      newCheckIn = {
        id: crypto.randomUUID(),
        id_sala: selectedSalaId,
        tipo_crianca: 'Membro',
        id_membro: addChildMembroId,
        nome_visitante: null,
        created_at: new Date().toISOString(),
        nome_responsavel: addChildNomeResponsavel.trim(),
        telefone_responsavel: addChildTelefoneResponsavel.trim(),
        data_nascimento: addChildDataNascimento,
        sexo: addChildSexo,
        necessidades_especiais: addChildNecessidades.trim() || undefined,
        restricoes_alimentares: addChildRestricoes.trim() || undefined,
        observacoes_medicas: addChildObservacoesMedicas.trim() || undefined,
        autoriza_imagem: addChildAutorizaImagem,
        foto_url: addChildAutorizaImagem && addChildFotoUrl ? addChildFotoUrl : undefined
      };
    } else {
      if (!addChildNomeVisitante.trim()) {
        showNotification('Informe o nome da criança visitante.', 'error');
        return;
      }

      newCheckIn = {
        id: crypto.randomUUID(),
        id_sala: selectedSalaId,
        tipo_crianca: 'Visitante',
        id_membro: null,
        nome_visitante: addChildNomeVisitante.trim(),
        created_at: new Date().toISOString(),
        nome_responsavel: addChildNomeResponsavel.trim(),
        telefone_responsavel: addChildTelefoneResponsavel.trim(),
        data_nascimento: addChildDataNascimento,
        sexo: addChildSexo,
        necessidades_especiais: addChildNecessidades.trim() || undefined,
        restricoes_alimentares: addChildRestricoes.trim() || undefined,
        observacoes_medicas: addChildObservacoesMedicas.trim() || undefined,
        autoriza_imagem: addChildAutorizaImagem,
        foto_url: addChildAutorizaImagem && addChildFotoUrl ? addChildFotoUrl : undefined
      };
    }

    const updatedCriancas = [...criancasSala, newCheckIn];
    await saveChildrenToDb(updatedCriancas);

    // Reset fields
    setAddChildMembroId('');
    setSearchChildQuery('');
    setShowSearchSuggestions(false);
    setAddChildNomeVisitante('');
    
    setAddChildNomeResponsavel('');
    setAddChildTelefoneResponsavel('');
    setAddChildDataNascimento('');
    setAddChildSexo('Masculino');
    setAddChildNecessidades('');
    setAddChildRestricoes('');
    setAddChildObservacoesMedicas('');
    setAddChildAutorizaImagem(false);
    setAddChildFotoUrl('');

    showNotification('Criança adicionada com sucesso!', 'success');
  };

  const handleRemoveCriancaFromSala = async (checkinId: string) => {
    const updatedCriancas = criancasSala.filter(c => c.id !== checkinId);
    await saveChildrenToDb(updatedCriancas);
    showNotification('Saída registrada com sucesso!', 'success');
  };

  // Helper selectors and loaders
  const activeSalaObj = salas.find(s => s.id === selectedSalaId);
  const activeTurmaObj = turmas.find(t => t.id === selectedTurmaId);
  const filteredSalasForSelection = salas.filter(s => s.id_turma === selectedTurmaId);
  const childrenInActiveSala = criancasSala.filter(c => c.id_sala === selectedSalaId);

  // Generate QR code data
  const getQrCodeUrl = () => {
    if (!activeSalaObj) return '';
    const churchName = selectedIgreja?.nome || 'Igreja';
    const associatedTurma = turmas.find(t => t.id === activeSalaObj.id_turma);
    const qrText = `SALA_KIDS|Igreja: ${churchName}|Sala: ${activeSalaObj.nome}|Turma: ${associatedTurma?.nome || 'Não definida'}|Idades: ${activeSalaObj.idade_minima}-${activeSalaObj.idade_maxima} anos|Capacidade: ${activeSalaObj.capacidade}|Status: ${activeSalaObj.status}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrText)}&color=0f172a&bgcolor=ffffff`;
  };

  if (!canAccessPainel && !canAccessTurmas && !canAccessSalas) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh] gap-4 bg-white/50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-200 dark:border-slate-800">
        <p className="text-red-500 font-bold uppercase tracking-widest text-sm">Acesso Negado</p>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Você não tem permissão de acesso para o Módulo Kids no seu perfil de usuário.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#E4A232] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Carregando Módulo Kids...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 font-['Inter']">
      
      {/* Notifications */}
      {successMsg && (
        <div className="fixed bottom-5 right-5 z-[100] bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Check size={20} className="stroke-white" />
          <span className="font-bold text-sm uppercase tracking-wider">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="fixed bottom-5 right-5 z-[100] bg-rose-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-pulse">
          <AlertCircle size={20} className="stroke-white" />
          <span className="font-bold text-sm uppercase tracking-wider">{errorMsg}</span>
        </div>
      )}

      {/* Header and Brand */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-amber-500/10 dark:bg-amber-500/5 rounded-3xl text-amber-500 shadow-inner">
            <Baby size={36} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">Kids</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Gestão de Turmas, Salas de Atendimento e Check-in Infantil</p>
          </div>
        </div>

        {/* Tab Navigation buttons */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200/50 dark:border-slate-800">
          {canAccessPainel && (
            <button 
              onClick={() => setActiveTab('painel')}
              className={`px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 ${
                activeTab === 'painel' 
                  ? 'bg-[#E4A232] text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Smile size={16} />
              Painel Operacional
            </button>
          )}
          {canAccessTurmas && (
            <button 
              onClick={() => setActiveTab('turmas')}
              className={`px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 ${
                activeTab === 'turmas' 
                  ? 'bg-[#E4A232] text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Users size={16} />
              Turmas (Categorias)
            </button>
          )}
          {canAccessSalas && (
            <button 
              onClick={() => setActiveTab('salas')}
              className={`px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 ${
                activeTab === 'salas' 
                  ? 'bg-[#E4A232] text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <DoorOpen size={16} />
              Salas
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: PAINEL OPERACIONAL (KIDS CHECK-IN AND ACTIVE ROOMS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'painel' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Active Check-in Management Interface (Only when Sala is Open & Operating) */}
          {isSalaAbertaOperator && activeSalaObj ? (
            <div className="space-y-8 animate-fade-in">
              {/* Back button and title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/85 shadow-sm">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsSalaAbertaOperator(false)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition text-slate-600 dark:text-slate-350 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                  >
                    ← Voltar para Painel de Salas
                  </button>
                  <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800"></div>
                  <div>
                    <h2 className="text-sm font-black uppercase text-slate-900 dark:text-white leading-tight">Painel de Atendimento</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Operando Ativamente</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 font-black text-[10px] uppercase tracking-wider rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Atendimento Aberto
                  </span>
                </div>
              </div>

              {/* Active Room Info Banner */}
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 dark:from-amber-550/10 border border-amber-500/30 rounded-[2.5rem] p-6 lg:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-4 max-w-2xl text-center md:text-left">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider rounded-full">
                    <Check size={12} /> Sala Ativa no Momento
                  </span>
                  <h2 className="text-3xl font-black uppercase text-slate-900 dark:text-white tracking-tight">
                    SALA: <span className="text-amber-600">{activeSalaObj.nome}</span>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] text-slate-400 font-normal">Turma Associada</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-1">{activeTurmaObj?.nome || 'N/D'}</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] text-slate-400 font-normal">Faixa Etária</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-1">{activeSalaObj.idade_minima} a {activeSalaObj.idade_maxima} anos</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 col-span-2 sm:col-span-1">
                      <p className="text-[10px] text-slate-400 font-normal">Capacidade / Presentes</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-1">
                        {childrenInActiveSala.length} / {activeSalaObj.capacidade}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button 
                      onClick={handleFecharSala}
                      className="px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white text-xs uppercase tracking-wider font-black rounded-xl shadow-md transition-all"
                    >
                      Encerrar Atendimento / Fechar Sala
                    </button>
                  </div>
                </div>

                {/* QR-CODE Container */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800/80 flex flex-col items-center justify-center gap-3">
                  <div className="relative w-44 h-44 bg-white rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getQrCodeUrl()} alt="QR-CODE Sala Aberta" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                    <QrCode size={12} /> Scan para Check-in
                  </span>
                </div>
              </div>

              {/* Main workspace splits */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Children Check-In controls */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/80 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                      <UserCheck size={20} className="text-[#E4A232]" />
                      Fazer Entrada (Check-In)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Insira os dados completos da criança para gerar a etiqueta e o QR Code de entrada.</p>
                  </div>

                  <div className="space-y-4">
                    {/* Selector of entry type (Membro vs Visitante) */}
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Tipo de Criança</label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button 
                          type="button"
                          onClick={() => {
                            setAddChildTipo('Membro');
                            setAddChildNomeVisitante('');
                          }}
                          className={`py-3 rounded-xl text-xs uppercase tracking-wider font-bold border transition-all ${
                            addChildTipo === 'Membro'
                              ? 'bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400 font-black'
                              : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950'
                          }`}
                        >
                          Membro Oficial
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setAddChildTipo('Visitante');
                            setAddChildMembroId('');
                            setSearchChildQuery('');
                          }}
                          className={`py-3 rounded-xl text-xs uppercase tracking-wider font-bold border transition-all ${
                            addChildTipo === 'Visitante'
                              ? 'bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400 font-black'
                              : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950'
                          }`}
                        >
                          Visitante
                        </button>
                      </div>
                    </div>

                    {/* Membro Selector / Visitante Input */}
                    {addChildTipo === 'Membro' ? (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Buscar Criança Cadastrada</label>
                        <div className="relative mt-2">
                          <input 
                            type="text"
                            placeholder="Digite o nome da criança para buscar..."
                            value={searchChildQuery}
                            onChange={(e) => {
                              setSearchChildQuery(e.target.value);
                              setShowSearchSuggestions(true);
                              if (addChildMembroId) {
                                setAddChildMembroId('');
                              }
                            }}
                            onFocus={() => setShowSearchSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                            className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                          
                          {showSearchSuggestions && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                              {(() => {
                                const filteredKids = membrosIgreja.filter(m => {
                                  const isChild = m.categoria && m.categoria.toLowerCase().includes('crian');
                                  if (!isChild) return false;
                                  if (!searchChildQuery) return true;
                                  return m.nome?.toLowerCase().includes(searchChildQuery.toLowerCase());
                                });

                                if (filteredKids.length === 0) {
                                  return (
                                    <div className="p-4 text-center text-slate-500 text-xs">
                                      Nenhuma criança encontrada com este nome.
                                    </div>
                                  );
                                }

                                return filteredKids.map(m => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                      setAddChildMembroId(m.id);
                                      setSearchChildQuery(m.nome);
                                      setShowSearchSuggestions(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-left border-b border-slate-100 dark:border-slate-800/50 last:border-0"
                                  >
                                    {m.foto_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={m.foto_url} alt={m.nome} className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">
                                        {m.nome?.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{m.nome}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">Membro Criança</p>
                                    </div>
                                    {addChildMembroId === m.id && (
                                      <Check size={16} className="text-green-500" />
                                    )}
                                  </button>
                                ));
                              })()}
                            </div>
                          )}
                        </div>
                        
                        {addChildMembroId && (
                          <div className="mt-2 flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 rounded-xl">
                            <div className="flex items-center gap-2">
                              <Check size={16} className="text-green-500" />
                              <span className="text-xs font-bold text-green-700 dark:text-green-400">
                                Criança selecionada: <span className="underline">{searchChildQuery}</span>
                              </span>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => {
                                setAddChildMembroId('');
                                setSearchChildQuery('');
                                setAddChildDataNascimento('');
                                setAddChildFotoUrl('');
                              }}
                              className="p-1 text-slate-400 hover:text-red-500"
                              title="Limpar seleção"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Visitante Input */
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Nome da Criança Visitante *</label>
                        <input 
                          type="text"
                          placeholder="Ex: Pedro Henrique"
                          value={addChildNomeVisitante}
                          onChange={(e) => setAddChildNomeVisitante(e.target.value)}
                          className="w-full mt-2 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                        />
                      </div>
                    )}

                    {/* Responsible Contact details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Nome do Responsável *</label>
                        <input 
                          type="text"
                          placeholder="Ex: Carlos Jorge"
                          value={addChildNomeResponsavel}
                          onChange={(e) => setAddChildNomeResponsavel(e.target.value)}
                          className="w-full mt-1.5 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Telefone do Responsável *</label>
                        <input 
                          type="text"
                          placeholder="Ex: (81) 98888-8888"
                          value={addChildTelefoneResponsavel}
                          onChange={(e) => setAddChildTelefoneResponsavel(e.target.value)}
                          className="w-full mt-1.5 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                        />
                      </div>
                    </div>

                    {/* Birthdate, Age and Gender */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Nascimento *</label>
                        <input 
                          type="date"
                          value={addChildDataNascimento}
                          onChange={(e) => setAddChildDataNascimento(e.target.value)}
                          className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-200"
                        />
                      </div>
                      
                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Idade (Calculada)</label>
                        <div className="w-full mt-1.5 p-3.5 bg-slate-100/80 dark:bg-slate-950/80 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl text-sm font-black text-slate-700 dark:text-slate-350 text-center select-none">
                          {addChildDataNascimento ? `${getAgeFromBirthDate(addChildDataNascimento)} anos` : 'Informe data'}
                        </div>
                      </div>

                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Sexo *</label>
                        <select 
                          value={addChildSexo}
                          onChange={(e) => setAddChildSexo(e.target.value as 'Masculino' | 'Feminino')}
                          className="w-full mt-1.5 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-200"
                        >
                          <option value="Masculino">Masculino</option>
                          <option value="Feminino">Feminino</option>
                        </select>
                      </div>
                    </div>

                    {/* Special text inputs: Special Needs, Food Restrictions, Medical Observations */}
                    <div className="space-y-3 pt-2">
                      {/* 1. Necessidades Especiais */}
                      <div className="bg-amber-500/5 dark:bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-2xl flex items-start gap-2.5">
                        <AlertCircle className="text-amber-500 mt-0.5 shrink-0" size={18} />
                        <div className="flex-1">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 leading-none">Necessidades Especiais</label>
                          <input 
                            type="text" 
                            value={addChildNecessidades}
                            onChange={(e) => setAddChildNecessidades(e.target.value)}
                            placeholder="Ex: Nenhuma, Autismo, Dificuldade de locomoção"
                            className="w-full bg-transparent mt-1 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* 2. Restrições Alimentares */}
                      <div className="bg-orange-500/5 dark:bg-orange-500/5 border border-orange-500/20 p-3.5 rounded-2xl flex items-start gap-2.5">
                        <Activity className="text-orange-500 mt-0.5 shrink-0" size={18} />
                        <div className="flex-1">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 leading-none">Restrições Alimentares</label>
                          <input 
                            type="text" 
                            value={addChildRestricoes}
                            onChange={(e) => setAddChildRestricoes(e.target.value)}
                            placeholder="Ex: Nenhuma, Lactose, Glúten, Amendoim"
                            className="w-full bg-transparent mt-1 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* 3. Observações Médicas */}
                      <div className="bg-rose-500/5 dark:bg-rose-500/5 border border-rose-500/20 p-3.5 rounded-2xl flex items-start gap-2.5">
                        <Heart className="text-rose-500 mt-0.5 shrink-0" size={18} />
                        <div className="flex-1">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 leading-none">Observações Médicas</label>
                          <input 
                            type="text" 
                            value={addChildObservacoesMedicas}
                            onChange={(e) => setAddChildObservacoesMedicas(e.target.value)}
                            placeholder="Ex: Asma (usa bombinha), Alergias a medicamentos"
                            className="w-full bg-transparent mt-1 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Image Authorization and Upload */}
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <input 
                          type="checkbox"
                          id="autoriza_imagem_check"
                          checked={addChildAutorizaImagem}
                          onChange={(e) => {
                            setAddChildAutorizaImagem(e.target.checked);
                            if (!e.target.checked) {
                              setAddChildFotoUrl('');
                            }
                          }}
                          className="h-4.5 w-4.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                        />
                        <label htmlFor="autoriza_imagem_check" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                          Autoriza divulgação de imagem da criança
                        </label>
                      </div>

                      {addChildAutorizaImagem && (
                        <div 
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              handleChildPhotoUpload(e.dataTransfer.files[0]);
                            }
                          }}
                          onClick={() => document.getElementById('child-photo-file-input')?.click()}
                          className={`p-4 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 min-h-[100px] ${
                            isDragging 
                              ? 'border-amber-500 bg-amber-500/10' 
                              : addChildFotoUrl 
                                ? 'border-green-500/50 bg-green-500/5' 
                                : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-950/40'
                          }`}
                        >
                          <input 
                            type="file"
                            id="child-photo-file-input"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                handleChildPhotoUpload(e.target.files[0]);
                              }
                            }}
                          />
                          
                          {addChildFotoUrl ? (
                            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-green-500">
                              <img src={addChildFotoUrl} alt="Foto da criança" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <UploadCloud size={16} className="text-white" />
                              </div>
                            </div>
                          ) : (
                            <UploadCloud size={24} className="text-slate-400" />
                          )}
                          
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {uploading ? 'Carregando foto...' : addChildFotoUrl ? 'Foto selecionada! Clique para alterar' : 'Arraste a foto da criança aqui'}
                            </p>
                            <p className="text-[10px] text-slate-400">Ou clique para escolher do seu dispositivo</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={handleAddCriancaToSala}
                      disabled={uploading}
                      className="w-full py-4 bg-amber-500 hover:bg-[#E4A232] text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={16} /> Confirmar Check-In na Sala
                    </button>
                  </div>
                </div>

                {/* Right Column: Present kids list */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/80 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <Baby size={20} className="text-[#E4A232]" />
                        Crianças Atendidas na Sala ({childrenInActiveSala.length})
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Lista de check-ins ativos com acesso a etiquetas de identificação.</p>
                    </div>
                  </div>

                  {childrenInActiveSala.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50/50 dark:bg-slate-950/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                      <Smile size={40} className="text-slate-350 dark:text-slate-600 mx-auto animate-bounce" />
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-wide">Nenhuma criança na sala ainda</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto font-normal">Use o painel ao lado para registrar os dados e iniciar os check-ins das crianças.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/80">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                            <th className="py-4 px-4">Identificação</th>
                            <th className="py-4 px-4">Responsável</th>
                            <th className="py-4 px-4 text-center">Ações de Atendimento</th>
                            <th className="py-4 px-4 text-right">Saída</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs font-bold">
                          {childrenInActiveSala.map((c) => {
                            let displayNome = '';
                            let displayPhoto = '';
                            
                            if (c.tipo_crianca === 'Membro') {
                              const foundMembro = membrosIgreja.find(m => m.id === c.id_membro);
                              displayNome = foundMembro?.nome || 'Membro não encontrado';
                              displayPhoto = c.foto_url || foundMembro?.foto_url || '';
                            } else {
                              displayNome = c.nome_visitante || 'Visitante';
                              displayPhoto = c.foto_url || '';
                            }

                            // Has special warnings
                            const hasAlerts = c.necessidades_especiais || c.restricoes_alimentares || c.observacoes_medicas;

                            return (
                              <tr key={c.id} className="text-slate-800 dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
                                      {c.autoriza_imagem && displayPhoto ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={displayPhoto} alt={displayNome} className="h-full w-full object-cover" />
                                      ) : (
                                        <Smile size={18} className="text-slate-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-black text-slate-900 dark:text-white truncate text-xs">{displayNome}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 flex items-center gap-1">
                                        <span className={`px-1.5 py-0.5 rounded-md ${
                                          c.tipo_crianca === 'Membro' 
                                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                                            : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                        }`}>
                                          {c.tipo_crianca}
                                        </span>
                                        • {getAgeFromBirthDate(c.data_nascimento)} anos
                                        {hasAlerts && (
                                          <span className="px-1 py-0.5 bg-rose-500/10 text-rose-500 rounded-md font-black">
                                            ALERTA
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                
                                <td className="py-3.5 px-4 min-w-[120px]">
                                  <p className="font-bold text-slate-700 dark:text-slate-350 truncate">{c.nome_responsavel}</p>
                                  <p className="text-[9px] text-slate-400 mt-0.5 font-mono">{c.telefone_responsavel}</p>
                                </td>

                                <td className="py-3.5 px-4">
                                  <div className="flex items-center justify-center gap-2">
                                    {/* Entry QR Code */}
                                    <button 
                                      onClick={() => setSelectedChildForQr(c)}
                                      className="p-2 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl transition-all"
                                      title="QR Code de Entrada"
                                    >
                                      <QrCode size={14} />
                                    </button>

                                    {/* Print Label Badge */}
                                    <button 
                                      onClick={() => setSelectedChildForBadge(c)}
                                      className="p-2 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all flex items-center gap-1 font-black uppercase text-[9px] tracking-wider"
                                      title="Etiqueta de Impressão"
                                    >
                                      <Printer size={14} />
                                      Etiqueta
                                    </button>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 text-right">
                                  <button 
                                    onClick={() => handleRemoveCriancaFromSala(c.id)}
                                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all border border-transparent hover:border-rose-200"
                                    title="Registrar Saída (Check-out)"
                                  >
                                    <X size={16} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Multi-Room list and operator workspace launcher (Dashboard view) */
            <div className="space-y-8 animate-fade-in">
              
              {/* Stats overview row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Salas de Atendimento</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{salas.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm space-y-1">
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Salas Abertas
                  </p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{salas.filter(s => s.status === 'Aberto').length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Salas Fechadas</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{salas.filter(s => s.status === 'Fechado').length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm space-y-1">
                  <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Check-ins Hoje</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{criancasSala.length}</p>
                </div>
              </div>

              {/* Action and title row */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm">
                <div>
                  <h2 className="text-base font-black uppercase text-slate-900 dark:text-white leading-tight">Painel Operacional Kids</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Gerenciamento ativo de salas e check-ins</p>
                </div>
                <button 
                  onClick={handleOpenNewSala}
                  className="px-5 py-3 bg-amber-500 hover:bg-[#E4A232] text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus size={16} /> Criar Nova Sala
                </button>
              </div>

              {/* If Show Room Form is True, render the room form directly here on the operational panel */}
              {showSalaForm && (
                <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] border-2 border-amber-500/20 shadow-xl space-y-6 max-w-2xl mx-auto animate-scale-up">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                      <Baby size={20} className="text-[#E4A232]" />
                      {editingSala ? 'Editar Detalhes da Sala' : 'Criar Nova Sala de Atendimento'}
                    </h3>
                    <button 
                      onClick={() => setShowSalaForm(false)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-slate-600"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveSala} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Nome da Sala *</label>
                      <input 
                        type="text"
                        required
                        placeholder="Ex: Sala 01, Tenda Laranja, Espaço Kids"
                        value={salaNome}
                        onChange={(e) => setSalaNome(e.target.value)}
                        className="w-full mt-2 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Turma Vinculada *</label>
                      <select 
                        value={salaTurmaId}
                        required
                        onChange={(e) => handleSelectTurmaForSala(e.target.value)}
                        className="w-full mt-2 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                      >
                        <option value="">-- Escolha a Turma --</option>
                        {turmas.map(t => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">Isso irá pré-carregar as configurações de idades e capacidade desta turma.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Idade Mínima</label>
                        <input 
                          type="number"
                          value={salaIdadeMin}
                          onChange={(e) => setSalaIdadeMin(parseInt(e.target.value) || 0)}
                          className="w-full mt-2 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Idade Máxima</label>
                        <input 
                          type="number"
                          value={salaIdadeMax}
                          onChange={(e) => setSalaIdadeMax(parseInt(e.target.value) || 0)}
                          className="w-full mt-2 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Capacidade Máxima</label>
                        <input 
                          type="number"
                          value={salaCapacidade}
                          onChange={(e) => setSalaCapacidade(parseInt(e.target.value) || 1)}
                          className="w-full mt-2 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Status Inicial</label>
                        <select 
                          value={salaStatus}
                          onChange={(e) => setSalaStatus(e.target.value as Sala['status'])}
                          className="w-full mt-2 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                        >
                          <option value="Aberto">Aberta (Ativa)</option>
                          <option value="Fechado">Fechada (Inativa)</option>
                          <option value="Encerrado">Encerrada</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                      <button 
                        type="button"
                        onClick={() => setShowSalaForm(false)}
                        className="px-5 py-3 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 text-slate-700 dark:text-slate-350 font-black uppercase text-xs tracking-wider rounded-xl transition"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit"
                        disabled={saving}
                        className="px-6 py-3 bg-amber-500 hover:bg-[#E4A232] text-white font-black uppercase text-xs tracking-wider rounded-xl shadow-md transition disabled:opacity-50"
                      >
                        {saving ? 'Gravando...' : 'Salvar Sala'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Salas Interactive Grid Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {salas.length === 0 ? (
                  <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 space-y-4">
                    <DoorOpen size={48} className="text-slate-300 dark:text-slate-600 mx-auto" />
                    <div>
                      <h4 className="text-base font-black uppercase text-slate-900 dark:text-white">Nenhuma sala cadastrada</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">Crie a sua primeira sala de atendimento kids clicando no botão Criar Nova Sala.</p>
                    </div>
                  </div>
                ) : (
                  salas.map((s) => {
                    const roomTurma = turmas.find(t => t.id === s.id_turma);
                    const roomKids = criancasSala.filter(c => c.id_sala === s.id);
                    const fillPercentage = Math.min(100, (roomKids.length / s.capacidade) * 100);
                    
                    return (
                      <div 
                        key={s.id} 
                        className="bg-white dark:bg-slate-900 rounded-[2.2rem] border border-slate-200/60 dark:border-slate-800/80 p-6 shadow-sm space-y-5 hover:shadow-md hover:border-amber-500/25 dark:hover:border-amber-500/25 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-4">
                          {/* Card Header: Title and Status Badge */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                              <h4 className="text-base font-black uppercase text-slate-900 dark:text-white tracking-tight">{s.nome}</h4>
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                                Turma: {roomTurma?.nome || 'N/D'}
                              </p>
                            </div>
                            
                            {/* Status Pill */}
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              s.status === 'Aberto'
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                : s.status === 'Fechado'
                                  ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}>
                              {s.status === 'Aberto' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>}
                              {s.status === 'Aberto' ? 'Aberta' : s.status === 'Fechado' ? 'Fechada' : 'Encerrada'}
                            </span>
                          </div>

                          {/* Quick statistics */}
                          <div className="grid grid-cols-2 gap-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/40">
                              <p className="text-[8px] text-slate-400">Faixa Etária</p>
                              <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 mt-0.5">
                                {s.idade_minima} - {s.idade_maxima} anos
                              </p>
                            </div>
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/40">
                              <p className="text-[8px] text-slate-400">Capacidade</p>
                              <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 mt-0.5">
                                {roomKids.length} / {s.capacidade} kids
                              </p>
                            </div>
                          </div>

                          {/* Capacity Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              <span>Ocupação da Sala</span>
                              <span>{Math.round(fillPercentage)}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  fillPercentage >= 90 
                                    ? 'bg-rose-500' 
                                    : fillPercentage >= 70 
                                      ? 'bg-amber-500' 
                                      : 'bg-green-500'
                                }`}
                                style={{ width: `${fillPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        {/* Room Card Actions */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
                          <button 
                            onClick={async () => {
                              // Automatically set open status if they click to operate/check-in
                              let updatedSalas = [...salas];
                              if (s.status !== 'Aberto') {
                                updatedSalas = salas.map(item => item.id === s.id ? { ...item, status: 'Aberto' as const } : item);
                                await saveSalasToDb(updatedSalas);
                              }
                              setSelectedSalaId(s.id);
                              setSelectedTurmaId(s.id_turma);
                              setIsSalaAbertaOperator(true);
                              localStorage.setItem(`kids_active_sala_${selectedIgreja?.id}`, s.id);
                            }}
                            className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-amber-500/20"
                          >
                            <DoorOpen size={14} /> Atendimento (Check-In)
                          </button>

                          <div className="grid grid-cols-3 gap-2">
                            {/* Change status to open */}
                            <button 
                              onClick={() => handleChangeSalaStatus(s.id, 'Aberto')}
                              disabled={s.status === 'Aberto'}
                              className="py-1.5 bg-green-500/5 hover:bg-green-500/10 text-green-600 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg text-[9px] font-black uppercase tracking-wider transition border border-green-500/10 cursor-pointer"
                            >
                              Abrir
                            </button>
                            {/* Change status to close */}
                            <button 
                              onClick={() => handleChangeSalaStatus(s.id, 'Fechado')}
                              disabled={s.status === 'Fechado'}
                              className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent dark:bg-slate-800 dark:text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition border border-transparent cursor-pointer"
                            >
                              Fechar
                            </button>
                            {/* Change status to end */}
                            <button 
                              onClick={() => handleChangeSalaStatus(s.id, 'Encerrado')}
                              disabled={s.status === 'Encerrado'}
                              className="py-1.5 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg text-[9px] font-black uppercase tracking-wider transition border border-rose-500/10 cursor-pointer"
                            >
                              Encerrar
                            </button>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 text-[10px] font-bold text-slate-400">
                            <button 
                              onClick={() => {
                                setEditingSala(s);
                                setSalaNome(s.nome);
                                setSalaTurmaId(s.id_turma);
                                setSalaIdadeMin(s.idade_minima);
                                setSalaIdadeMax(s.idade_maxima);
                                setSalaCapacidade(s.capacidade);
                                setSalaStatus(s.status);
                                setShowSalaForm(true);
                              }}
                              className="hover:text-[#E4A232] px-2 py-1 transition flex items-center gap-1"
                            >
                              <Edit3 size={12} /> Editar
                            </button>
                            <button 
                              onClick={() => handleDeleteSala(s.id)}
                              className="hover:text-rose-500 px-2 py-1 transition flex items-center gap-1"
                            >
                              <Trash2 size={12} /> Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: SUB-MÓDULO TURMAS (CATEGORIES OF KIDS BY AGE) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'turmas' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Header Action Row */}
          {!showTurmaForm && (
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm">
              <p className="text-xs uppercase tracking-widest font-black text-slate-450 dark:text-slate-500 pl-2">
                Turmas Cadastradas ({turmas.length})
              </p>
              <button 
                onClick={handleOpenNewTurma}
                className="px-5 py-3 bg-amber-500 hover:bg-[#E4A232] text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <Plus size={16} /> Nova Turma
              </button>
            </div>
          )}

          {/* Form Create/Edit Turma */}
          {showTurmaForm && (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] border border-slate-250 dark:border-slate-850 shadow-md space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  {editingTurma ? 'Editar Turma' : 'Cadastrar Nova Turma'}
                </h3>
                <button 
                  onClick={() => setShowTurmaForm(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveTurma} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column: Core inputs */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Nome da Turma *</label>
                      <input 
                        type="text"
                        required
                        placeholder="Ex: Turma Berçário, Maternal, Juniores"
                        value={turmaNome}
                        onChange={(e) => setTurmaNome(e.target.value)}
                        className="w-full mt-2 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black uppercase tracking-wider text-slate-500">Idade Mínima</label>
                        <input 
                          type="number"
                          min="0"
                          max="20"
                          value={turmaIdadeMin}
                          onChange={(e) => setTurmaIdadeMin(parseInt(e.target.value) || 0)}
                          className="w-full mt-2 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black uppercase tracking-wider text-slate-500">Idade Máxima</label>
                        <input 
                          type="number"
                          min="0"
                          max="20"
                          value={turmaIdadeMax}
                          onChange={(e) => setTurmaIdadeMax(parseInt(e.target.value) || 0)}
                          className="w-full mt-2 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black uppercase tracking-wider text-slate-500">Capacidade da Turma</label>
                        <input 
                          type="number"
                          min="1"
                          value={turmaCapacidade}
                          onChange={(e) => setTurmaCapacidade(parseInt(e.target.value) || 1)}
                          className="w-full mt-2 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black uppercase tracking-wider text-slate-500">Tipo de Entrada</label>
                        <select 
                          value={turmaTipoEntrada}
                          onChange={(e) => setTurmaTipoEntrada(e.target.value as any)}
                          className="w-full mt-2 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                        >
                          <option value="Link Público">Link Público</option>
                          <option value="Manual">Manual</option>
                          <option value="Automático">Automático</option>
                        </select>
                      </div>
                    </div>

                    {/* Drag & Drop Cover Image Upload */}
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Imagem (Capa da Turma)</label>
                      <div 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('turma-cover-upload')?.click()}
                        className={`mt-2 p-6 rounded-2xl border-2 border-dashed text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                          isDragging 
                            ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-955/10' 
                            : uploading 
                              ? 'border-slate-300 bg-slate-50 cursor-wait opacity-85'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 hover:border-amber-500/50'
                        }`}
                      >
                        <input 
                          type="file"
                          id="turma-cover-upload"
                          className="hidden"
                          accept="image/*"
                          disabled={uploading}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(e.target.files[0]);
                            }
                          }}
                        />
                        {turmaImagemUrl ? (
                          <div className="relative w-full max-w-[200px] h-32 rounded-xl overflow-hidden shadow-md">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={turmaImagemUrl} alt="Preview Capa" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 hover:opacity-100 opacity-0 flex items-center justify-center transition-all">
                              <span className="text-[10px] text-white font-black uppercase tracking-widest">Alterar Imagem</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <UploadCloud size={32} className="text-slate-400" />
                            <div className="space-y-1">
                              <p className="text-xs font-black text-slate-700 dark:text-slate-350 uppercase">Arraste e Solte a Imagem</p>
                              <p className="text-[10px] text-slate-400 font-medium">Ou clique para navegar pelo seu dispositivo</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Manage Team Members and Roles */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-4">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Users size={16} className="text-[#E4A232]" />
                        Membros da Equipe (Cargos)
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">Defina líderes, professores e auxiliares escalados para essa turma.</p>
                    </div>

                    {/* Member selection controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-6">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Membro da Igreja</label>
                        <select 
                          value={selectedMemberId}
                          onChange={(e) => setSelectedMemberId(e.target.value)}
                          className="w-full mt-1.5 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
                        >
                          <option value="">-- Selecione --</option>
                          {membrosIgreja.map(m => (
                            <option key={m.id} value={m.id}>{m.nome}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Cargo / Função</label>
                        <select 
                          value={selectedMemberCargo}
                          onChange={(e) => setSelectedMemberCargo(e.target.value as any)}
                          className="w-full mt-1.5 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
                        >
                          <option value="Lider">Lider</option>
                          <option value="Coordenador">Coordenador</option>
                          <option value="Supervisor">Supervisor</option>
                          <option value="Professor">Professor</option>
                          <option value="Auxiliar">Auxiliar</option>
                          <option value="Monitor">Monitor</option>
                          <option value="Recepcionista">Recepcionista</option>
                          <option value="Berçario">Berçario</option>
                          <option value="Voluntário">Voluntário</option>
                          <option value="Segurança">Segurança</option>
                          <option value="Apoio">Apoio</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <button 
                          type="button"
                          onClick={handleAddTurmaMembro}
                          className="w-full py-3.5 bg-amber-500 hover:bg-[#E4A232] text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>

                    {/* Team Members List */}
                    <div className="border border-slate-200/50 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      {turmaMembros.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 font-bold uppercase">
                          Nenhum membro escalado ainda
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                          {turmaMembros.map((tm) => (
                            <div key={tm.id_membro} className="p-3 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-950/20">
                              <div>
                                <p className="font-black text-slate-800 dark:text-slate-250">{tm.nome_membro}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-0.5">{tm.cargo}</p>
                              </div>
                              <button 
                                type="button"
                                onClick={() => handleRemoveTurmaMembro(tm.id_membro)}
                                className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-5">
                  <button 
                    type="button"
                    onClick={() => setShowTurmaForm(false)}
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-amber-500 hover:bg-[#E4A232] disabled:opacity-55 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    {saving && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                    Salvar Turma
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Turmas Grid */}
          {!showTurmaForm && (
            turmas.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/80 shadow-sm space-y-4">
                <Users size={48} className="text-slate-350 dark:text-slate-650 mx-auto" />
                <h3 className="text-lg font-black uppercase text-slate-800 dark:text-slate-200 tracking-tight">Nenhuma Turma Cadastrada</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto font-normal">Cadastre suas turmas e divida o público infantil por idades para iniciar as operações.</p>
                <div className="pt-2">
                  <button 
                    onClick={handleOpenNewTurma}
                    className="px-6 py-3.5 bg-amber-500 hover:bg-[#E4A232] text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md transition-all"
                  >
                    Cadastrar Primeira Turma
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {turmas.map((t) => (
                  <div key={t.id} className="bg-white dark:bg-slate-900 rounded-[2.2rem] border border-slate-200/50 dark:border-slate-800/80 shadow-sm overflow-hidden flex flex-col justify-between group">
                    <div>
                      {/* Turma Image / Header */}
                      <div className="relative h-44 bg-slate-100 dark:bg-slate-950 overflow-hidden border-b border-slate-100 dark:border-slate-800">
                        {t.imagem_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.imagem_url} alt={t.nome} className="w-full h-full object-cover group-hover:scale-105 duration-350 transition-all" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Baby size={48} className="opacity-40" />
                          </div>
                        )}
                        <span className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-md dark:bg-slate-900/90 rounded-full font-black text-[10px] uppercase tracking-wider text-amber-600 shadow-sm">
                          {t.tipo_entrada}
                        </span>
                      </div>

                      {/* Content details */}
                      <div className="p-6 space-y-4">
                        <div className="space-y-1">
                          <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">{t.nome}</h3>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                            Idades: {t.idade_minima} a {t.idade_maxima} anos
                          </p>
                        </div>

                        {/* Team members capsule summary */}
                        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                          <p className="text-[10px] text-slate-450 dark:text-slate-550 font-black uppercase tracking-widest">Equipe da Turma ({t.membros?.length || 0})</p>
                          {t.membros && t.membros.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {t.membros.slice(0, 3).map((m) => (
                                <span key={m.id_membro} className="inline-flex px-2 py-0.5 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-350 rounded-lg text-[9px] font-bold uppercase border border-slate-100 dark:border-slate-800">
                                  {m.nome_membro.split(' ')[0]} ({m.cargo})
                                </span>
                              ))}
                              {t.membros.length > 3 && (
                                <span className="inline-flex px-2 py-0.5 bg-slate-50 dark:bg-slate-950 text-slate-400 rounded-lg text-[9px] font-bold uppercase border border-slate-100">
                                  +{t.membros.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Nenhum membro escalado</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-between bg-slate-50/50 dark:bg-slate-950/20">
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1">
                        Capacidade: <span className="text-slate-700 dark:text-slate-200 font-black">{t.capacidade} crianças</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleOpenEditTurma(t)}
                          className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                          title="Editar Turma"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteTurma(t.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all"
                          title="Excluir Turma"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: SUB-MÓDULO SALAS (PHYSICAL SPACES & SCHEDULING) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'salas' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Header Action Row */}
          {!showSalaForm && (
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm">
              <p className="text-xs uppercase tracking-widest font-black text-slate-450 dark:text-slate-500 pl-2">
                Salas Cadastradas ({salas.length})
              </p>
              <button 
                onClick={handleOpenNewSala}
                className="px-5 py-3 bg-amber-500 hover:bg-[#E4A232] text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <Plus size={16} /> Nova Sala
              </button>
            </div>
          )}

          {/* Form Create/Edit Sala */}
          {showSalaForm && (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] border border-slate-250 dark:border-slate-850 shadow-md space-y-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  {editingSala ? 'Editar Sala de Atendimento' : 'Cadastrar Nova Sala'}
                </h3>
                <button 
                  onClick={() => setShowSalaForm(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveSala} className="space-y-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500">Nome da Sala *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Sala 01, Tenda Laranja, Espaço Kids"
                    value={salaNome}
                    onChange={(e) => setSalaNome(e.target.value)}
                    className="w-full mt-2 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500">Turma Vinculada *</label>
                  <select 
                    value={salaTurmaId}
                    required
                    onChange={(e) => handleSelectTurmaForSala(e.target.value)}
                    className="w-full mt-2 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                  >
                    <option value="">-- Escolha a Turma --</option>
                    {turmas.map(t => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Isso irá pré-carregar as configurações de idades e capacidade desta turma.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500">Idade Mínima</label>
                    <input 
                      type="number"
                      value={salaIdadeMin}
                      onChange={(e) => setSalaIdadeMin(parseInt(e.target.value) || 0)}
                      className="w-full mt-2 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500">Idade Máxima</label>
                    <input 
                      type="number"
                      value={salaIdadeMax}
                      onChange={(e) => setSalaIdadeMax(parseInt(e.target.value) || 0)}
                      className="w-full mt-2 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500">Capacidade Máxima</label>
                    <input 
                      type="number"
                      value={salaCapacidade}
                      onChange={(e) => setSalaCapacidade(parseInt(e.target.value) || 1)}
                      className="w-full mt-2 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500">Status Operacional</label>
                    <select 
                      value={salaStatus}
                      onChange={(e) => setSalaStatus(e.target.value as any)}
                      className="w-full mt-2 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-200"
                    >
                      <option value="Fechado">Fechado</option>
                      <option value="Aberto">Aberto</option>
                      <option value="Encerrado">Encerrado</option>
                    </select>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-5 mt-4">
                  <button 
                    type="button"
                    onClick={() => setShowSalaForm(false)}
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-amber-500 hover:bg-[#E4A232] disabled:opacity-55 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    {saving && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                    Salvar Sala
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Programação Manager Section (Only shown when active) */}
          {programacaoSala && (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] border-2 border-[#E4A232]/60 dark:border-slate-800 shadow-xl space-y-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar size={22} className="text-[#E4A232]" />
                    Programação & Atividades da Sala: <span className="text-[#E4A232]">{programacaoSala.nome}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Agende atividades da sala e integre com a agenda oficial da igreja.</p>
                </div>
                <button 
                  onClick={() => setProgramacaoSala(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Add Programming Inline Form */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 items-end">
                <div className="md:col-span-6">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Descrição da Atividade</label>
                  <input 
                    type="text"
                    placeholder="Ex: Louvor infantil, Teatrinho de fantoches"
                    value={progDescricao}
                    onChange={(e) => setProgDescricao(e.target.value)}
                    className="w-full mt-1.5 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-200"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Data & Hora</label>
                  <input 
                    type="datetime-local"
                    value={progDataHora}
                    onChange={(e) => setProgDataHora(e.target.value)}
                    className="w-full mt-1.5 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <button 
                    onClick={handleAddProgramacao}
                    className="w-full py-3.5 bg-[#E4A232] hover:opacity-95 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} /> Adicionar
                  </button>
                </div>
              </div>

              {/* Programming List */}
              <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-inner">
                {(!programacaoSala.programacao || programacaoSala.programacao.length === 0) ? (
                  <div className="p-12 text-center text-sm text-slate-400 font-bold uppercase tracking-wide">
                    Nenhuma atividade agendada para esta sala ainda.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                        <th className="py-3 px-6">Atividade</th>
                        <th className="py-3 px-6">Horário</th>
                        <th className="py-3 px-6 text-center">Status Agenda</th>
                        <th className="py-3 px-6 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold">
                      {programacaoSala.programacao.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 text-slate-800 dark:text-slate-250 transition-all">
                          <td className="py-4 px-6 font-black">{p.descricao}</td>
                          <td className="py-4 px-6 text-xs text-slate-500">
                            {new Date(p.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="py-4 px-6 text-center">
                            {p.id_agenda ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] uppercase font-black tracking-wider rounded-full border border-emerald-500/20">
                                <Check size={10} /> Agendado Oficial
                              </span>
                            ) : (
                              <button 
                                onClick={() => handleSyncWithMainAgenda(p)}
                                className="px-3 py-1 bg-amber-500 hover:bg-[#E4A232] text-white text-[10px] uppercase font-black tracking-wider rounded-full shadow-sm transition-all flex items-center gap-1 mx-auto"
                              >
                                <Calendar size={10} /> Agenda da Igreja
                              </button>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button 
                              onClick={() => handleRemoveProgramacao(p.id)}
                              className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-2 rounded-lg transition-all"
                              title="Remover Programação"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Salas List (Grid) */}
          {!showSalaForm && !programacaoSala && (
            salas.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/80 shadow-sm space-y-4">
                <DoorOpen size={48} className="text-slate-350 dark:text-slate-650 mx-auto" />
                <h3 className="text-lg font-black uppercase text-slate-800 dark:text-slate-200 tracking-tight">Nenhuma Sala Cadastrada</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto font-normal">Cadastre suas salas de aula/atendimento para gerenciar as crianças e criar a programação oficial.</p>
                <div className="pt-2">
                  <button 
                    onClick={handleOpenNewSala}
                    className="px-6 py-3.5 bg-amber-500 hover:bg-[#E4A232] text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md transition-all"
                  >
                    Cadastrar Primeira Sala
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {salas.map((s) => {
                  const associatedTurma = turmas.find(t => t.id === s.id_turma);
                  return (
                    <div key={s.id} className="bg-white dark:bg-slate-900 rounded-[2.2rem] border border-slate-200/50 dark:border-slate-800/80 shadow-sm p-6 space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white truncate max-w-[160px] tracking-tight">{s.nome}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              Turma: <span className="text-slate-700 dark:text-slate-300 font-black">{associatedTurma?.nome || 'Não definida'}</span>
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            s.status === 'Aberto' 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                              : s.status === 'Encerrado' 
                                ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400' 
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}>
                            {s.status}
                          </span>
                        </div>

                        {/* Room characteristics stats */}
                        <div className="grid grid-cols-2 gap-2 text-xs font-bold uppercase border-t border-slate-100 dark:border-slate-800 pt-3 text-slate-500 dark:text-slate-400">
                          <div className="p-2.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-slate-100/50 dark:border-slate-850">
                            <p className="text-[9px] text-slate-400 font-normal">Idades</p>
                            <p className="text-slate-800 dark:text-slate-250 mt-0.5">{s.idade_minima} a {s.idade_maxima} anos</p>
                          </div>
                          <div className="p-2.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-slate-100/50 dark:border-slate-850">
                            <p className="text-[9px] text-slate-400 font-normal">Capacidade</p>
                            <p className="text-slate-800 dark:text-slate-250 mt-0.5">{s.capacidade} crianças</p>
                          </div>
                        </div>
                      </div>

                      {/* Card actions and agenda buttons */}
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between gap-2">
                        <button 
                          onClick={() => handleOpenProgramacao(s)}
                          className="px-4 py-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                        >
                          <Calendar size={14} /> Programação ({s.programacao?.length || 0})
                        </button>
                        
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => handleOpenEditSala(s)}
                            className="p-2 text-slate-500 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-lg transition-all"
                            title="Editar Sala"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button 
                            onClick={() => handleDeleteSala(s.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all"
                            title="Excluir Sala"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

    </div>
  );
}
