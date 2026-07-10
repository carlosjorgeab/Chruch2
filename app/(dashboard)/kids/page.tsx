'use client';

import { useState, useEffect, useRef } from 'react';
import { useIgreja } from '@/context/IgrejaContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Baby, Users, DoorOpen, Plus, Trash2, Calendar, Edit3, Check, X, 
  UploadCloud, ArrowRight, UserCheck, Smile, HelpCircle, QrCode, AlertCircle,
  Activity, Heart, ShieldAlert, Phone, User, Info, FileText, Printer, Clock,
  MessageSquare, Paperclip, Megaphone
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
  status?: string;
  observacao_checkout?: string;
  data_checkout?: string;
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

  // Editing check-in state
  const [editingCheckin, setEditingCheckin] = useState<SalaCrianca | null>(null);
  const [editChildNomeResponsavel, setEditChildNomeResponsavel] = useState<string>('');
  const [editChildTelefoneResponsavel, setEditChildTelefoneResponsavel] = useState<string>('');
  const [editChildDataNascimento, setEditChildDataNascimento] = useState<string>('');
  const [editChildSexo, setEditChildSexo] = useState<'Masculino' | 'Feminino'>('Masculino');
  const [editChildNecessidades, setEditChildNecessidades] = useState<string>('');
  const [editChildRestricoes, setEditChildRestricoes] = useState<string>('');
  const [editChildObservacoesMedicas, setEditChildObservacoesMedicas] = useState<string>('');
  const [editChildAutorizaImagem, setEditChildAutorizaImagem] = useState<boolean>(false);
  const [editChildFotoUrl, setEditChildFotoUrl] = useState<string>('');

  // Checking out child state
  const [checkingOutChild, setCheckingOutChild] = useState<SalaCrianca | null>(null);
  const [checkoutObservation, setCheckoutObservation] = useState<string>('');

  // Print format state: 'A' = 14 labels (3.39 x 10.10 cm), 'B' = 18 labels (4.66 x 6.35 cm)
  const [badgeSize, setBadgeSize] = useState<'A' | 'B'>('A');
  const [badgePrintMode, setBadgePrintMode] = useState<'single' | 'full' | 'specific'>('single');
  const [badgeSpecificPosition, setBadgeSpecificPosition] = useState<number>(0);

  // Tab controls inside Room Operator view
  const [leftPanelTab, setLeftPanelTab] = useState<'checkin' | 'comunicado'>('checkin');
  const [rightPanelTab, setRightPanelTab] = useState<'presentes' | 'comunicados'>('presentes');

  // Comunicado States
  const [comunicadoCriancasIds, setComunicadoCriancasIds] = useState<string[]>([]);
  const [comunicadoTipo, setComunicadoTipo] = useState<'Observação' | 'Ocorrências' | 'Conteúdo' | 'Evidências' | 'Outros'>('Observação');
  const [comunicadoEnviarResponsaveis, setComunicadoEnviarResponsaveis] = useState<boolean>(false);
  const [comunicadoDescricao, setComunicadoDescricao] = useState<string>('');
  const [comunicadoArquivos, setComunicadoArquivos] = useState<{name: string, url: string}[]>([]);
  const [uploadingComunicadoFile, setUploadingComunicadoFile] = useState<boolean>(false);
  const [isDraggingComunicado, setIsDraggingComunicado] = useState<boolean>(false);
  const [comunicadosList, setComunicadosList] = useState<any[]>([]);
  const [loadingComunicados, setLoadingComunicados] = useState<boolean>(false);

  const loadComunicados = async (salaId: string) => {
    if (!salaId) return;
    setLoadingComunicados(true);
    try {
      const { data, error } = await supabase
        .from('kids_comunicados')
        .select('*')
        .eq('id_sala', salaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComunicadosList(data || []);
    } catch (err) {
      console.error('Erro ao buscar comunicados:', err);
    } finally {
      setLoadingComunicados(false);
    }
  };

  const handleComunicadoFileUpload = async (file: File) => {
    setUploadingComunicadoFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/financeiro/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao realizar upload do anexo.');
      }

      setComunicadoArquivos(prev => [...prev, { name: file.name, url: result.url }]);
      showNotification('Anexo carregado com sucesso!', 'success');
    } catch (err: any) {
      console.error(err);
      showNotification(`Erro no upload do anexo: ${err.message}`, 'error');
    } finally {
      setUploadingComunicadoFile(false);
    }
  };

  const handleSaveComunicado = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSalaId) {
      showNotification('Nenhuma sala ativa selecionada.', 'error');
      return;
    }

    if (comunicadoCriancasIds.length === 0) {
      showNotification('Selecione pelo menos uma criança para o comunicado.', 'error');
      return;
    }

    if (!comunicadoDescricao.trim()) {
      showNotification('Insira uma descrição para o comunicado.', 'error');
      return;
    }

    try {
      const payload = {
        id_sala: selectedSalaId,
        criancas_ids: comunicadoCriancasIds,
        tipo: comunicadoTipo,
        enviar_responsaveis: comunicadoEnviarResponsaveis,
        descricao: comunicadoDescricao,
        arquivos: comunicadoArquivos,
      };

      const { data, error } = await supabase
        .from('kids_comunicados')
        .insert([payload])
        .select('id')
        .single();

      if (error) throw error;

      // Save attachments to the kids_comunicados_anexos table as well!
      if (comunicadoArquivos.length > 0 && data?.id) {
        const anexosPayload = comunicadoArquivos.map(file => ({
          id_comunicado: data.id,
          nome: file.name,
          url: file.url
        }));
        
        const { error: anexoError } = await supabase
          .from('kids_comunicados_anexos')
          .insert(anexosPayload);
          
        if (anexoError) {
          console.error('Erro ao salvar anexos adicionais:', anexoError);
        }
      }

      showNotification('Comunicado criado com sucesso!', 'success');
      
      // Clear form states
      setComunicadoCriancasIds([]);
      setComunicadoDescricao('');
      setComunicadoArquivos([]);
      setComunicadoEnviarResponsaveis(false);
      setComunicadoTipo('Observação');

      // Reload list
      await loadComunicados(selectedSalaId);
    } catch (err: any) {
      console.error('Erro ao salvar comunicado:', err);
      showNotification(`Erro ao salvar comunicado: ${err.message}`, 'error');
    }
  };

  const handleSelectAllKidsForComunicado = (select: boolean) => {
    if (select) {
      setComunicadoCriancasIds(childrenInActiveSala.map(c => c.id));
    } else {
      setComunicadoCriancasIds([]);
    }
  };

  useEffect(() => {
    if (selectedSalaId) {
      loadComunicados(selectedSalaId);
    }
  }, [selectedSalaId]);

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

  // Load data from DB
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

      // 2. Load Turmas from kids_turmas
      const { data: turmasDb, error: tError } = await supabase
        .from('kids_turmas')
        .select('*')
        .eq('id_igreja', selectedIgreja.id)
        .order('nome', { ascending: true });

      if (tError) throw tError;

      let loadedTurmas: Turma[] = [];
      const turmaIds = (turmasDb || []).map(t => t.id);

      if (turmaIds.length > 0) {
        // Load members for these turmas
        const { data: tmDb, error: tmError } = await supabase
          .from('kids_turma_membros')
          .select('*')
          .in('id_turma', turmaIds);

        if (tmError) throw tmError;

        loadedTurmas = (turmasDb || []).map(t => {
          const filteredMembers = (tmDb || [])
            .filter(tm => tm.id_turma === t.id)
            .map(tm => {
              const mObj = members?.find(m => m.id === tm.id_membro);
              return {
                id_membro: tm.id_membro,
                nome_membro: mObj?.nome || 'Membro não encontrado',
                cargo: tm.cargo as any
              };
            });

          return {
            id: t.id,
            nome: t.nome,
            idade_minima: t.idade_minima ?? 0,
            idade_maxima: t.idade_maxima ?? 12,
            capacidade: t.capacidade ?? 15,
            tipo_entrada: t.tipo_entrada as any,
            imagem_url: t.imagem_url || '',
            membros: filteredMembers
          };
        });
      }

      setTurmas(loadedTurmas);

      // 3. Load Salas from kids_salas
      let loadedSalas: Sala[] = [];
      if (turmaIds.length > 0) {
        const { data: salasDb, error: sError } = await supabase
          .from('kids_salas')
          .select('*')
          .in('id_turma', turmaIds);

        if (sError) throw sError;

        const salaIds = (salasDb || []).map(s => s.id);
        let progDb: any[] = [];
        if (salaIds.length > 0) {
          const { data: pDb, error: pError } = await supabase
            .from('kids_programacao_sala')
            .select('*')
            .in('id_sala', salaIds);

          if (pError) throw pError;
          progDb = pDb || [];
        }

        loadedSalas = (salasDb || []).map(s => {
          const sProgs = progDb
            .filter(p => p.id_sala === s.id)
            .map(p => ({
              id: p.id,
              descricao: p.descricao,
              data_hora: p.data_hora,
              id_agenda: p.id_agenda
            }));

          return {
            id: s.id,
            id_turma: s.id_turma,
            nome: s.nome,
            idade_minima: s.idade_minima ?? 0,
            idade_maxima: s.idade_maxima ?? 12,
            capacidade: s.capacidade ?? 15,
            status: s.status as any,
            programacao: sProgs
          };
        });
      }

      setSalas(loadedSalas);

      // 4. Load Children check-in records from kids_sala_criancas
      let loadedCriancas: SalaCrianca[] = [];
      const allSalaIds = loadedSalas.map(s => s.id);
      if (allSalaIds.length > 0) {
        const { data: criancasDb, error: cError } = await supabase
          .from('kids_sala_criancas')
          .select('*')
          .in('id_sala', allSalaIds);

        if (cError) throw cError;

        loadedCriancas = (criancasDb || []).map(c => ({
          id: c.id,
          id_sala: c.id_sala,
          tipo_crianca: c.tipo_crianca as any,
          id_membro: c.id_membro,
          nome_visitante: c.nome_visitante,
          created_at: c.created_at,
          nome_responsavel: c.nome_responsavel || '',
          telefone_responsavel: c.telefone_responsavel || '',
          data_nascimento: c.data_nascimento || '',
          sexo: c.sexo as any,
          necessidades_especiais: c.necessidades_especiais || '',
          restricoes_alimentares: c.restricoes_alimentares || '',
          observacoes_medicas: c.observacoes_medicas || '',
          autoriza_imagem: c.autoriza_imagem || false,
          foto_url: c.foto_url || '',
          status: c.status || 'Aberto',
          observacao_checkout: c.observacao_checkout || '',
          data_checkout: c.data_checkout || ''
        }));
      }

      setCriancasSala(loadedCriancas);

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

  // Save Turmas to cloud DB (real tables)
  const saveTurmasToDb = async (updatedTurmas: Turma[]) => {
    if (!selectedIgreja?.id) return;
    try {
      // 1. Prepare Turma records for DB upsert
      const turmasToUpsert = updatedTurmas.map(t => ({
        id: t.id,
        id_igreja: selectedIgreja.id,
        nome: t.nome,
        idade_minima: t.idade_minima,
        idade_maxima: t.idade_maxima,
        capacidade: t.capacidade,
        tipo_entrada: t.tipo_entrada,
        imagem_url: t.imagem_url || null
      }));

      // Upsert into kids_turmas
      if (turmasToUpsert.length > 0) {
        const { error: tError } = await supabase
          .from('kids_turmas')
          .upsert(turmasToUpsert);
        if (tError) throw tError;
      }

      // 2. Sync members
      // Gather all turma IDs being saved
      const turmaIds = updatedTurmas.map(t => t.id);
      
      // Delete old member mappings for these turmas
      if (turmaIds.length > 0) {
        const { error: dError } = await supabase
          .from('kids_turma_membros')
          .delete()
          .in('id_turma', turmaIds);
        if (dError) throw dError;
      }

      // Insert new member mappings
      const membersToInsert: any[] = [];
      updatedTurmas.forEach(t => {
        if (t.membros && t.membros.length > 0) {
          t.membros.forEach(m => {
            membersToInsert.push({
              id_turma: t.id,
              id_membro: m.id_membro,
              cargo: m.cargo
            });
          });
        }
      });

      if (membersToInsert.length > 0) {
        const { error: mError } = await supabase
          .from('kids_turma_membros')
          .insert(membersToInsert);
        if (mError) throw mError;
      }

      setTurmas(updatedTurmas);
      showNotification('Turmas salvas com sucesso no banco de dados!', 'success');
    } catch (err: any) {
      console.error('Error saving turmas to database:', err);
      showNotification('Erro ao salvar as turmas no banco de dados.', 'error');
    }
  };

  // Save Salas to cloud DB (real tables)
  const saveSalasToDb = async (updatedSalas: Sala[]) => {
    if (!selectedIgreja?.id) return;
    try {
      // Prepare Sala records for DB upsert
      const salasToUpsert = updatedSalas.map(s => ({
        id: s.id,
        id_turma: s.id_turma,
        nome: s.nome,
        idade_minima: s.idade_minima,
        idade_maxima: s.idade_maxima,
        capacidade: s.capacidade,
        status: s.status
      }));

      // Upsert into kids_salas
      if (salasToUpsert.length > 0) {
        const { error: sError } = await supabase
          .from('kids_salas')
          .upsert(salasToUpsert);
        if (sError) throw sError;
      }

      // Sync Programacao
      const salaIds = updatedSalas.map(s => s.id);
      if (salaIds.length > 0) {
        const { error: dError } = await supabase
          .from('kids_programacao_sala')
          .delete()
          .in('id_sala', salaIds);
        if (dError) throw dError;
      }

      const progToInsert: any[] = [];
      updatedSalas.forEach(s => {
        if (s.programacao && s.programacao.length > 0) {
          s.programacao.forEach(p => {
            progToInsert.push({
              id: p.id,
              id_sala: s.id,
              id_agenda: p.id_agenda || null,
              descricao: p.descricao,
              data_hora: new Date(p.data_hora).toISOString()
            });
          });
        }
      });

      if (progToInsert.length > 0) {
        const { error: pError } = await supabase
          .from('kids_programacao_sala')
          .insert(progToInsert);
        if (pError) throw pError;
      }

      setSalas(updatedSalas);
      showNotification('Salas salvas com sucesso no banco de dados!', 'success');
    } catch (err: any) {
      console.error('Error saving salas:', err);
      showNotification('Erro ao salvar as salas no banco de dados.', 'error');
    }
  };

  // Save Children check-in records to cloud DB (real table)
  const saveChildrenToDb = async (updatedCriancas: SalaCrianca[]) => {
    if (!selectedIgreja?.id) return;
    try {
      const criancasToUpsert = updatedCriancas.map(c => ({
        id: c.id,
        id_sala: c.id_sala,
        tipo_crianca: c.tipo_crianca,
        id_membro: c.id_membro || null,
        nome_visitante: c.nome_visitante || null,
        nome_responsavel: c.nome_responsavel,
        telefone_responsavel: c.telefone_responsavel,
        data_nascimento: c.data_nascimento || null,
        sexo: c.sexo,
        necessidades_especiais: c.necessidades_especiais || null,
        restricoes_alimentares: c.restricoes_alimentares || null,
        observacoes_medicas: c.observacoes_medicas || null,
        autoriza_imagem: c.autoriza_imagem,
        foto_url: c.foto_url || null,
        status: c.status || 'Aberto',
        observacao_checkout: c.observacao_checkout || null,
        data_checkout: c.data_checkout || null,
        created_at: c.created_at
      }));

      if (criancasToUpsert.length > 0) {
        const { error: cError } = await supabase
          .from('kids_sala_criancas')
          .upsert(criancasToUpsert);
        if (cError) throw cError;
      }

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
      // Explicitly delete from database
      const { error: dError } = await supabase
        .from('kids_turmas')
        .delete()
        .eq('id', turmaId);
      if (dError) throw dError;

      const updatedTurmasList = turmas.filter(t => t.id !== turmaId);
      const updatedSalas = salas.filter(s => s.id_turma !== turmaId);
      
      setTurmas(updatedTurmasList);
      setSalas(updatedSalas);
      showNotification('Turma excluída com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showNotification('Erro ao excluir turma.', 'error');
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
      const { error: dError } = await supabase
        .from('kids_salas')
        .delete()
        .eq('id', salaId);
      if (dError) throw dError;

      const updatedSalas = salas.filter(s => s.id !== salaId);
      const updatedCriancas = criancasSala.filter(c => c.id_sala !== salaId);
      
      setSalas(updatedSalas);
      setCriancasSala(updatedCriancas);
      showNotification('Sala excluída com sucesso!', 'success');
      
      if (selectedSalaId === salaId) {
        setIsSalaAbertaOperator(false);
        setSelectedSalaId('');
        localStorage.removeItem(`kids_active_sala_${selectedIgreja?.id}`);
      }
    } catch (err) {
      console.error(err);
      showNotification('Erro ao excluir sala.', 'error');
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
    // Clean string to keep only the YYYY-MM-DD prefix to handle full ISO datetimes
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

  // Add child or save edited check-in to the currently open Room with all detailed fields
  const handleAddCriancaToSala = async () => {
    if (!selectedSalaId) {
      showNotification('Selecione ou abra uma sala primeiro.', 'error');
      return;
    }

    const currentSala = salas.find(s => s.id === selectedSalaId);
    if (!currentSala) return;

    // Enforce Room Status Constraint: Only open rooms can receive new check-ins
    if (currentSala.status !== 'Aberto' && !editingCheckin) {
      showNotification('A sala não está aberta. Abra a sala para poder admitir novas crianças.', 'error');
      return;
    }

    if (!editingCheckin) {
      // Calculate current occupancy only for new check-ins
      const currentCount = criancasSala.filter(c => c.id_sala === selectedSalaId).length;
      if (currentCount >= currentSala.capacidade) {
        if (!confirm('A capacidade máxima da sala já foi atingida. Deseja adicionar mesmo assim?')) {
          return;
        }
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

    let updatedCriancas: SalaCrianca[];

    if (editingCheckin) {
      // EDIT MODE: Update existing check-in
      updatedCriancas = criancasSala.map(c => {
        if (c.id === editingCheckin.id) {
          return {
            ...c,
            tipo_crianca: addChildTipo,
            id_membro: addChildTipo === 'Membro' ? (addChildMembroId || null) : null,
            nome_visitante: addChildTipo === 'Visitante' ? addChildNomeVisitante.trim() : null,
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
        return c;
      });

      try {
        await saveChildrenToDb(updatedCriancas);
        setEditingCheckin(null);
        showNotification('Check-in editado com sucesso!', 'success');
      } catch (err) {
        console.error(err);
        showNotification('Erro ao salvar edição de check-in.', 'error');
        return;
      }
    } else {
      // INSERT MODE: Add new check-in
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

      updatedCriancas = [...criancasSala, newCheckIn];
      try {
        await saveChildrenToDb(updatedCriancas);
        showNotification('Criança adicionada com sucesso!', 'success');
      } catch (err) {
        console.error(err);
        showNotification('Erro ao salvar check-in.', 'error');
        return;
      }
    }

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
  };

  const handleRemoveCriancaFromSala = async (checkinId: string) => {
    if (!confirm('Deseja realmente excluir este check-in?')) return;
    try {
      const { error: dError } = await supabase
        .from('kids_sala_criancas')
        .delete()
        .eq('id', checkinId);
      if (dError) throw dError;

      const updatedCriancas = criancasSala.filter(c => c.id !== checkinId);
      setCriancasSala(updatedCriancas);
      showNotification('Check-in excluído com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showNotification('Erro ao excluir check-in.', 'error');
    }
  };

  const handleOpenEditCheckin = (c: SalaCrianca) => {
    setEditingCheckin(c);
    setLeftPanelTab('checkin'); // Switch to check-in tab to show editing fields
    setAddChildTipo(c.tipo_crianca);
    setAddChildMembroId(c.id_membro || '');
    setAddChildNomeVisitante(c.nome_visitante || '');
    setAddChildNomeResponsavel(c.nome_responsavel || '');
    setAddChildTelefoneResponsavel(c.telefone_responsavel || '');
    setAddChildDataNascimento(c.data_nascimento || '');
    setAddChildSexo(c.sexo || 'Masculino');
    setAddChildNecessidades(c.necessidades_especiais || '');
    setAddChildRestricoes(c.restricoes_alimentares || '');
    setAddChildObservacoesMedicas(c.observacoes_medicas || '');
    setAddChildAutorizaImagem(c.autoriza_imagem || false);
    setAddChildFotoUrl(c.foto_url || '');

    const container = document.getElementById('checkin-form-title-container');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEditCheckin = () => {
    setEditingCheckin(null);
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
  };

  const handleOpenCheckout = (c: SalaCrianca) => {
    setCheckingOutChild(c);
    setCheckoutObservation(c.observacao_checkout || '');
  };

  const handleSaveCheckout = async () => {
    if (!checkingOutChild) return;

    try {
      const updatedCriancas = criancasSala.map(c => {
        if (c.id === checkingOutChild.id) {
          return {
            ...c,
            status: 'Saída',
            observacao_checkout: checkoutObservation.trim() || undefined,
            data_checkout: new Date().toISOString()
          };
        }
        return c;
      });

      await saveChildrenToDb(updatedCriancas);
      setCheckingOutChild(null);
      setCheckoutObservation('');
      showNotification('Check-out realizado com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showNotification('Erro ao salvar check-out.', 'error');
    }
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

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">Status da Sala:</span>
                  <select
                    value={activeSalaObj.status || 'Fechado'}
                    onChange={async (e) => {
                      const newStatus = e.target.value as any;
                      const updated = salas.map(s => s.id === activeSalaObj.id ? { ...s, status: newStatus } : s);
                      await saveSalasToDb(updated);
                      showNotification(`Status da sala alterado para ${newStatus}.`, 'success');
                    }}
                    className="p-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="Aberto">🟢 Aberto</option>
                    <option value="Fechado">🔴 Fechado</option>
                    <option value="Encerrado">🔒 Encerrado</option>
                  </select>
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
                {/* Left Column: Children Check-In controls & Comunicados */}
                <div id="checkin-form-title-container" className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/80 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                      {leftPanelTab === 'comunicado' && activeSalaObj.status === 'Aberto' ? (
                        <>
                          <MessageSquare size={20} className="text-[#E4A232]" />
                          Criar Comunicado
                        </>
                      ) : editingCheckin ? (
                        <>
                          <Edit3 size={20} className="text-[#E4A232]" />
                          Editar Check-In
                        </>
                      ) : (
                        <>
                          <UserCheck size={20} className="text-[#E4A232]" />
                          Fazer Entrada (Check-In)
                        </>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                      {leftPanelTab === 'comunicado' && activeSalaObj.status === 'Aberto'
                        ? 'Envie comunicados gerais, ocorrências ou orientações para os responsáveis e registre no sistema.'
                        : 'Insira os dados completos da criança para gerar a etiqueta e o QR Code de entrada.'}
                    </p>
                  </div>

                  {/* Tab Switcher inside Left Panel (Only if Room is Open) */}
                  {activeSalaObj.status === 'Aberto' && !editingCheckin && (
                    <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl gap-1 border border-slate-200/40 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setLeftPanelTab('checkin')}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                          leftPanelTab === 'checkin'
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        ➕ Check-In
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeftPanelTab('comunicado')}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                          leftPanelTab === 'comunicado'
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        📢 Comunicado
                      </button>
                    </div>
                  )}

                  {/* Room Status Alert: If room is not open, block check-ins and announcements */}
                  {activeSalaObj.status !== 'Aberto' && !editingCheckin ? (
                    <div className="flex flex-col items-center justify-center text-center p-6 bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 rounded-2xl space-y-4 py-8">
                      <div className="p-3 bg-amber-500/10 text-amber-500 rounded-full animate-pulse">
                        <AlertCircle size={28} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Sala {activeSalaObj.status === 'Fechado' ? 'Fechada' : 'Encerrada'}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 leading-relaxed">
                          O atendimento nesta sala está **{activeSalaObj.status}**. Altere o status para "Aberto" no seletor de status acima para registrar novos alunos ou criar comunicados.
                        </p>
                      </div>
                    </div>
                  ) : leftPanelTab === 'comunicado' && activeSalaObj.status === 'Aberto' ? (
                    /* COMUNICADO FORM */
                    <form onSubmit={handleSaveComunicado} className="space-y-4">
                      {/* Selection of children */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Destinatários (Crianças) *</label>
                          <div className="flex gap-2 text-[9px] font-black uppercase tracking-widest">
                            <button
                              type="button"
                              onClick={() => handleSelectAllKidsForComunicado(true)}
                              className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                            >
                              Todos
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleSelectAllKidsForComunicado(false)}
                              className="text-slate-500 hover:underline cursor-pointer"
                            >
                              Nenhum
                            </button>
                          </div>
                        </div>
                        <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-950 space-y-2">
                          {childrenInActiveSala.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center font-bold py-2">Nenhuma criança presente na sala ainda.</p>
                          ) : (
                            childrenInActiveSala.map(c => {
                              const name = c.tipo_crianca === 'Membro' 
                                ? (membrosIgreja.find(m => m.id === c.id_membro)?.nome || 'Membro')
                                : (c.nome_visitante || 'Visitante');
                              const isChecked = comunicadoCriancasIds.includes(c.id);
                              return (
                                <label key={c.id} className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isChecked) {
                                        setComunicadoCriancasIds(comunicadoCriancasIds.filter(id => id !== c.id));
                                      } else {
                                        setComunicadoCriancasIds([...comunicadoCriancasIds, c.id]);
                                      }
                                    }}
                                    className="h-4 w-4 rounded text-amber-500 border-slate-300 focus:ring-amber-500"
                                  />
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{name}</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{comunicadoCriancasIds.length} de {childrenInActiveSala.length} selecionadas</p>
                      </div>

                      {/* Tipo de Comunicado */}
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Tipo de Comunicado</label>
                        <select
                          value={comunicadoTipo}
                          onChange={(e) => setComunicadoTipo(e.target.value as any)}
                          className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-200 focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="Observação">📝 Observação</option>
                          <option value="Ocorrências">⚠️ Ocorrência</option>
                          <option value="Conteúdo">📚 Conteúdo Ministrado</option>
                          <option value="Evidências">📸 Evidências / Fotos</option>
                          <option value="Outros">🔔 Outros</option>
                        </select>
                      </div>

                      {/* Enviar para Responsáveis */}
                      <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-850">
                        <input
                          type="checkbox"
                          id="comunicadoEnviarResponsaveis"
                          checked={comunicadoEnviarResponsaveis}
                          onChange={(e) => setComunicadoEnviarResponsaveis(e.target.checked)}
                          className="h-4 w-4 rounded text-amber-500 border-slate-300 focus:ring-amber-500 cursor-pointer"
                        />
                        <label htmlFor="comunicadoEnviarResponsaveis" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                          Notificar Responsáveis por WhatsApp/Painel
                        </label>
                      </div>

                      {/* Descrição */}
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Descrição do Comunicado *</label>
                        <textarea
                          rows={3}
                          required
                          value={comunicadoDescricao}
                          onChange={(e) => setComunicadoDescricao(e.target.value)}
                          placeholder="Digite aqui os detalhes do comunicado..."
                          className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-200 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      {/* Files Upload (Inclusão de um ou vários arquivos) */}
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500 block mb-1.5">Anexos / Imagens</label>
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingComunicado(true);
                          }}
                          onDragLeave={() => setIsDraggingComunicado(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingComunicado(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              Array.from(e.dataTransfer.files).forEach(file => {
                                handleComunicadoFileUpload(file);
                              });
                            }
                          }}
                          onClick={() => {
                            if (!uploadingComunicadoFile) {
                              document.getElementById('comunicado-file-input')?.click();
                            }
                          }}
                          className={`p-4 rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer ${
                            uploadingComunicadoFile
                              ? 'border-amber-500 bg-amber-50/5 cursor-wait'
                              : isDraggingComunicado
                                ? 'border-amber-500 bg-amber-500/10'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-amber-500/50'
                          }`}
                        >
                          <input
                            type="file"
                            id="comunicado-file-input"
                            className="hidden"
                            multiple
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                Array.from(e.target.files).forEach(file => {
                                  handleComunicadoFileUpload(file);
                                });
                              }
                            }}
                          />
                          {uploadingComunicadoFile ? (
                            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-1" />
                          ) : (
                            <UploadCloud size={20} className="text-amber-500 mb-1" />
                          )}
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {uploadingComunicadoFile ? 'Enviando arquivos...' : 'Arraste ou clique para anexar arquivos'}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Imagens, relatórios, PDF, etc.</p>
                        </div>

                        {/* Attached Files List */}
                        {comunicadoArquivos.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            {comunicadoArquivos.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs">
                                <span className="font-bold text-slate-750 dark:text-slate-350 truncate max-w-[180px] flex items-center gap-1.5">
                                  <Paperclip size={12} className="text-slate-400" />
                                  {file.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setComunicadoArquivos(comunicadoArquivos.filter((_, i) => i !== idx))}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-rose-500 rounded-lg transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={uploadingComunicadoFile}
                        className="w-full py-3 bg-[#E4A232] hover:opacity-95 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <MessageSquare size={14} /> Registrar Comunicado
                      </button>
                    </form>
                  ) : (
                    /* CHECK-IN FORM */
                    <div className="space-y-4">
                      {/* Selector of entry type (Membro vs Visitante) */}
                      {!editingCheckin && (
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
                      )}

                      {/* Membro Selector / Visitante Input */}
                      <div className="space-y-4">
                        {addChildTipo === 'Membro' ? (
                          /* Membro Autocomplete Input */
                          <div className="relative">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Buscar Criança Cadastrada</label>
                            {editingCheckin ? (
                              <div className="mt-1.5 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-black text-slate-700 dark:text-slate-300">
                                {membrosIgreja.find(m => m.id === addChildMembroId)?.nome || 'Criança Oficial'}
                              </div>
                            ) : (
                              <>
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
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-left border-b border-slate-100 dark:border-slate-800/50 last:border-0 cursor-pointer"
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
                                      className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                                      title="Limpar seleção"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                )}
                              </>
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
                              disabled={!!editingCheckin}
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

                        <div className="flex flex-col gap-2 pt-2">
                          <button 
                            onClick={handleAddCriancaToSala}
                            disabled={uploading}
                            className="w-full py-4 bg-amber-500 hover:bg-[#E4A232] text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {editingCheckin ? (
                              <>
                                <Check size={16} /> Confirmar Edição de Check-In
                              </>
                            ) : (
                              <>
                                <Plus size={16} /> Confirmar Check-In na Sala
                              </>
                            )}
                          </button>
                          {editingCheckin && (
                            <button
                              type="button"
                              onClick={handleCancelEditCheckin}
                              className="w-full py-3.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/40 text-slate-600 dark:text-slate-400 font-black uppercase text-xs tracking-widest rounded-2xl transition-all"
                            >
                              Cancelar Edição
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Present kids list */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/80 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        {rightPanelTab === 'presentes' ? (
                          <>
                            <Baby size={20} className="text-[#E4A232]" />
                            Crianças Atendidas ({childrenInActiveSala.length})
                          </>
                        ) : (
                          <>
                            <Megaphone size={20} className="text-[#E4A232]" />
                            Comunicados Enviados ({comunicadosList.length})
                          </>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {rightPanelTab === 'presentes' 
                          ? 'Lista de check-ins ativos com acesso a etiquetas de identificação.'
                          : 'Histórico de avisos, ocorrências e comunicados enviados para os pais.'}
                      </p>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl self-stretch sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setRightPanelTab('presentes')}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                          rightPanelTab === 'presentes'
                            ? 'bg-white dark:bg-slate-900 text-[#E4A232] shadow-sm'
                            : 'text-slate-500 hover:text-slate-755 dark:hover:text-slate-300'
                        }`}
                      >
                        Presentes
                      </button>
                      <button
                        type="button"
                        onClick={() => setRightPanelTab('comunicados')}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                          rightPanelTab === 'comunicados'
                            ? 'bg-white dark:bg-slate-900 text-[#E4A232] shadow-sm'
                            : 'text-slate-500 hover:text-slate-755 dark:hover:text-slate-300'
                        }`}
                      >
                        Comunicados
                      </button>
                    </div>
                  </div>

                  {rightPanelTab === 'presentes' ? (
                    childrenInActiveSala.length === 0 ? (
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
                            <th className="py-4 px-4">Status</th>
                            <th className="py-4 px-4 text-center">Ações</th>
                            <th className="py-4 px-4 text-right">Check-out</th>
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
                              <tr key={c.id} className={`text-slate-800 dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all ${c.status === 'Saída' ? 'opacity-70 bg-slate-50/30' : ''}`}>
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
                                  {c.status === 'Saída' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                      Saída
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-pulse">
                                      Ativo
                                    </span>
                                  )}
                                </td>

                                <td className="py-3.5 px-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    {/* Edit check-in */}
                                    <button 
                                      onClick={() => handleOpenEditCheckin(c)}
                                      className="p-2 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl transition-all"
                                      title="Editar Check-in"
                                    >
                                      <Edit3 size={14} />
                                    </button>

                                    {/* Checkout QR Code */}
                                    <button 
                                      onClick={() => setSelectedChildForQr(c)}
                                      className="p-2 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl transition-all"
                                      title="QR Code de Checkout"
                                    >
                                      <QrCode size={14} />
                                    </button>

                                    {/* Print Label Badge */}
                                    <button 
                                      onClick={() => setSelectedChildForBadge(c)}
                                      className="p-2 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all flex items-center gap-1 font-black uppercase text-[9px] tracking-wider"
                                      title="Imprimir Etiqueta"
                                    >
                                      <Printer size={14} />
                                      Etiqueta
                                    </button>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 text-right">
                                  {c.status === 'Saída' ? (
                                    <div className="text-right">
                                      <p className="text-[10px] text-slate-400">Saída realizada</p>
                                      {c.data_checkout && (
                                        <p className="text-[9px] font-mono text-slate-400">
                                          {new Date(c.data_checkout).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => handleOpenCheckout(c)}
                                      className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm transition-all"
                                      title="Registrar Check-out"
                                    >
                                      Check-out
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                  ) : (
                    /* COMUNICADOS TAB */
                    loadingComunicados ? (
                      <div className="flex flex-col items-center justify-center py-16 space-y-3">
                        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Carregando comunicados...</p>
                      </div>
                    ) : comunicadosList.length === 0 ? (
                      <div className="text-center py-16 bg-slate-50/50 dark:bg-slate-950/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                        <Megaphone size={40} className="text-slate-350 dark:text-slate-600 mx-auto" />
                        <p className="text-sm text-slate-400 font-bold uppercase tracking-wide">Nenhum comunicado enviado</p>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto font-normal">Use a aba "📢 Comunicado" no painel da esquerda para criar novos comunicados.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                        {comunicadosList.map((comunicado) => {
                          // Parse criancas_ids if it's JSON or string
                          let ids: string[] = [];
                          try {
                            ids = typeof comunicado.criancas_ids === 'string' 
                              ? JSON.parse(comunicado.criancas_ids) 
                              : (comunicado.criancas_ids || []);
                          } catch (e) {
                            ids = comunicado.criancas_ids || [];
                          }

                          // Find selected children names
                          const selectedChildrenNames = ids.includes('all') 
                            ? ['Todas as crianças'] 
                            : childrenInActiveSala
                                .filter(c => ids.includes(c.id))
                                .map(c => c.tipo_crianca === 'Membro' 
                                  ? (membrosIgreja.find(m => m.id === c.id_membro)?.nome || 'Criança') 
                                  : (c.nome_visitante || 'Visitante')
                                );

                          // Format Date
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

                          // Badge color mapping
                          const badgeColors: Record<string, string> = {
                            'Observação': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                            'Ocorrências': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                            'Conteúdo': 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
                            'Evidências': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
                            'Outros': 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
                          };

                          return (
                            <div key={comunicado.id} className="p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full border ${badgeColors[comunicado.tipo] || 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                                  {comunicado.tipo}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold">{formattedDate}</span>
                              </div>
                              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-semibold whitespace-pre-line">{comunicado.descricao}</p>
                              {selectedChildrenNames.length > 0 && (
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold pt-1 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap gap-1">
                                  <span className="text-slate-400">Destinatários:</span>
                                  <span className="text-slate-700 dark:text-slate-300">{selectedChildrenNames.join(', ')}</span>
                                </div>
                              )}
                              {files.length > 0 && (
                                <div className="space-y-1 pt-1">
                                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Anexos:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {files.map((file, fileIdx) => (
                                      <a
                                        key={fileIdx}
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-black text-[#E4A232] hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors"
                                      >
                                        <Paperclip size={10} />
                                        {file.name}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )
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

      {/* MODALS SECTION */}

      {/* 2. CHECK-OUT MODAL */}
      {checkingOutChild && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-150 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
              <h3 className="text-md font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <DoorOpen size={18} className="text-rose-500" />
                Registrar Check-out (Saída)
              </h3>
              <button 
                onClick={() => setCheckingOutChild(null)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Child profile summary */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
                  {checkingOutChild.autoriza_imagem && checkingOutChild.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={checkingOutChild.foto_url} alt="Criança" className="h-full w-full object-cover" />
                  ) : (
                    <Smile size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {checkingOutChild.tipo_crianca === 'Membro' 
                      ? (membrosIgreja.find(m => m.id === checkingOutChild.id_membro)?.nome || 'Membro não encontrado')
                      : (checkingOutChild.nome_visitante || 'Visitante')}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Responsável: <span className="text-slate-700 dark:text-slate-300 font-black">{checkingOutChild.nome_responsavel}</span>
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                    Fone: {checkingOutChild.telefone_responsavel}
                  </p>
                </div>
              </div>

              {/* QR-CODE of Checkout */}
              <div className="text-center space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Código QR de Verificação</label>
                <div className="inline-block p-4 bg-white dark:bg-white rounded-2xl border border-slate-100 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`KIDS_CHECKOUT|${checkingOutChild.id}|${checkingOutChild.nome_responsavel}`)}`} 
                    alt="Checkout QR Code" 
                    className="w-32 h-32" 
                  />
                </div>
                <p className="text-[9px] text-slate-450 font-medium">Escaneie para validar a liberação de segurança</p>
              </div>

              {/* Entry Time Info */}
              <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 flex justify-between items-center text-xs font-bold">
                <span className="text-slate-500">Hora de Entrada (Check-in):</span>
                <span className="text-amber-600 dark:text-amber-400 font-black flex items-center gap-1.5">
                  <Clock size={14} />
                  {new Date(checkingOutChild.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              {/* Observation Field */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Observações do Checkout</label>
                <textarea 
                  value={checkoutObservation}
                  onChange={(e) => setCheckoutObservation(e.target.value)}
                  placeholder="Ex: Entregue à mãe, saiu calmo, lanchou antes de sair."
                  rows={3}
                  className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-200"
                />
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-6 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setCheckingOutChild(null)}
                  className="px-5 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Voltar
                </button>
                <button 
                  onClick={handleSaveCheckout}
                  className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  Confirmar Check-out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. QR-CODE VIEW MODAL */}
      {selectedChildForQr && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-150 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
              <h3 className="text-md font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <QrCode size={18} className="text-amber-500" />
                QR Code de Checkout
              </h3>
              <button 
                onClick={() => setSelectedChildForQr(null)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <div className="p-8 text-center space-y-6">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                Criança: <span className="text-slate-900 dark:text-white font-black">
                  {selectedChildForQr.tipo_crianca === 'Membro' 
                    ? (membrosIgreja.find(m => m.id === selectedChildForQr.id_membro)?.nome || 'Membro não encontrado')
                    : (selectedChildForQr.nome_visitante || 'Visitante')}
                </span>
              </p>

              <div className="inline-block p-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`KIDS_CHECKOUT|${selectedChildForQr.id}|${selectedChildForQr.nome_responsavel}`)}`} 
                  alt="Checkout QR Code" 
                  className="w-48 h-48 mx-auto" 
                />
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 font-semibold text-left p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850">
                <p>• <span className="font-bold">Responsável:</span> {selectedChildForQr.nome_responsavel}</p>
                <p>• <span className="font-bold">Telefone:</span> {selectedChildForQr.telefone_responsavel}</p>
                <p>• <span className="font-bold">Entrada:</span> {new Date(selectedChildForQr.created_at).toLocaleTimeString()}</p>
              </div>

              <button 
                onClick={() => setSelectedChildForQr(null)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-250 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. PRINT BADGE PREVIEW MODAL */}
      {selectedChildForBadge && (() => {
        const activeSalaObj = salas.find(s => s.id === selectedSalaId);
        
        const displayNome = selectedChildForBadge.tipo_crianca === 'Membro' 
          ? (membrosIgreja.find(m => m.id === selectedChildForBadge.id_membro)?.nome || 'Membro não encontrado')
          : (selectedChildForBadge.nome_visitante || 'Visitante');
        
        const displayPhoto = selectedChildForBadge.foto_url || (selectedChildForBadge.tipo_crianca === 'Membro' ? (membrosIgreja.find(m => m.id === selectedChildForBadge.id_membro)?.foto_url || '') : '');
        const hasPhoto = selectedChildForBadge.autoriza_imagem && displayPhoto;
        
        const isA = badgeSize === 'A';
        
        // Label renderers helper
        const renderLabelA = (child: SalaCrianca) => {
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`KIDS_CHECKOUT|${child.id}|${child.nome_responsavel}`)}`;
          return (
            <div className="w-full h-full flex flex-row items-center bg-white text-slate-900 border border-slate-300 rounded-xl overflow-hidden font-sans box-border" style={{ padding: '0.2cm', gap: '0.15cm', height: '100%', width: '100%' }}>
              {/* Photo */}
              <div className="flex-shrink-0 flex items-center justify-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50" style={{ width: '2.5cm', height: '2.5cm' }}>
                {hasPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayPhoto} alt={displayNome} className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                ) : (
                  <div className="text-center p-1">
                    <Smile size={20} className="text-slate-400 mx-auto" />
                    <span className="text-[7px] text-slate-400 font-bold block mt-0.5">Sem Foto</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 flex flex-col justify-between h-full min-w-0" style={{ gap: '2px' }}>
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[7px] font-black tracking-widest text-slate-500 uppercase leading-none">Criança</span>
                    <span className="text-[7px] font-black text-indigo-600 bg-indigo-500/10 px-1 rounded-sm uppercase leading-none">{child.tipo_crianca}</span>
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-tight text-slate-950 truncate mt-0.5 leading-tight">
                    {displayNome}
                  </h3>
                  <p className="text-[8px] font-bold text-slate-700 mt-0.5">
                    Idade: <span className="font-black text-slate-950">{getAgeFromBirthDate(child.data_nascimento)} anos</span>
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-1 space-y-0.5">
                  <p className="text-[8px] font-medium text-slate-600 leading-tight truncate">
                    <span className="font-bold text-slate-800">Resp:</span> {child.nome_responsavel}
                  </p>
                  <p className="text-[8px] font-mono text-slate-500 leading-none">
                    <span className="font-bold text-slate-800">Fone:</span> {child.telefone_responsavel}
                  </p>
                  <p className="text-[8px] font-bold text-emerald-650 leading-none flex items-center gap-1">
                    <span>Entrada:</span> {new Date(child.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {(child.necessidades_especiais || child.restricoes_alimentares || child.observacoes_medicas) && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-600 text-[6.5px] font-black px-1 py-0.5 rounded-sm uppercase truncate leading-none mt-0.5">
                    ⚠ {child.necessidades_especiais || child.restricoes_alimentares || child.observacoes_medicas}
                  </div>
                )}
              </div>

              {/* QR Code */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center bg-white" style={{ width: '2.5cm', height: '2.5cm' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeUrl} alt="QR Code Checkout" style={{ width: '2.1cm', height: '2.1cm' }} referrerPolicy="no-referrer" />
                <span className="text-[5.5px] text-slate-400 uppercase font-black tracking-widest mt-0.5 leading-none">Checkout QR</span>
              </div>
            </div>
          );
        };

        const renderLabelB = (child: SalaCrianca) => {
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`KIDS_CHECKOUT|${child.id}|${child.nome_responsavel}`)}`;
          return (
            <div className="w-full h-full flex flex-col justify-between bg-white text-slate-900 border border-slate-300 rounded-xl overflow-hidden font-sans box-border" style={{ padding: '0.15cm', height: '100%', width: '100%', gap: '1px' }}>
              <div className="flex justify-between items-center border-b border-slate-100 pb-0.5 leading-none">
                <span className="text-[6.5px] font-black text-[#E4A232] uppercase truncate max-w-[4cm]">{activeSalaObj?.nome || 'Sala Kids'}</span>
                <span className="text-[6px] font-black text-slate-400 uppercase">{child.tipo_crianca}</span>
              </div>

              <h3 className="text-[10px] font-black uppercase text-slate-950 truncate leading-tight">
                {displayNome}
              </h3>

              <div className="flex gap-1.5 items-center min-w-0 flex-1">
                <div className="flex-shrink-0 flex items-center justify-center border border-slate-200 rounded-md overflow-hidden bg-slate-50" style={{ width: '1.4cm', height: '1.4cm' }}>
                  {hasPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={displayPhoto} alt={displayNome} className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="text-center">
                      <Smile size={14} className="text-slate-400 mx-auto" />
                      <span className="text-[5.5px] text-slate-400 font-bold block leading-none">Sem Foto</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 space-y-0.5 leading-none">
                  <p className="text-[7.5px] font-bold text-slate-800">
                    Idade: <span className="font-black text-slate-950">{getAgeFromBirthDate(child.data_nascimento)} anos</span>
                  </p>
                  <p className="text-[7px] text-slate-600 truncate">
                    <span className="font-bold">Resp:</span> {child.nome_responsavel.split(' ')[0]}
                  </p>
                  <p className="text-[7px] text-slate-500 font-mono leading-none">
                    {child.telefone_responsavel}
                  </p>
                  <p className="text-[7px] text-emerald-650 font-bold leading-none">
                    Entrada: {new Date(child.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-slate-150 pt-0.5 leading-none">
                {(child.necessidades_especiais || child.restricoes_alimentares || child.observacoes_medicas) ? (
                  <div className="text-[5.5px] font-black text-rose-600 bg-rose-50 px-1 py-0.5 rounded-sm uppercase max-w-[3.2cm] truncate leading-none">
                    ⚠ {child.necessidades_especiais || child.restricoes_alimentares || child.observacoes_medicas}
                  </div>
                ) : (
                  <span className="text-[5.5px] text-slate-400 uppercase font-black tracking-widest leading-none">Validação de Saída</span>
                )}

                <div className="flex-shrink-0 flex items-center justify-center bg-white" style={{ width: '1.3cm', height: '1.3cm' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeUrl} alt="QR Code Checkout" style={{ width: '1.15cm', height: '1.15cm' }} referrerPolicy="no-referrer" />
                </div>
              </div>
            </div>
          );
        };

        const totalGridCells = isA ? 14 : 18;

        return (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-150 dark:border-slate-800 shadow-2xl w-full max-w-4xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
                <div className="flex items-center gap-2">
                  <Printer size={20} className="text-indigo-500 animate-pulse" />
                  <div>
                    <h3 className="text-md font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">
                      Impressão de Etiquetas de Identificação
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                      Aluno: <span className="text-indigo-600 dark:text-indigo-400">{displayNome}</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedChildForBadge(null)}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} className="text-slate-500" />
                </button>
              </div>

              {/* Main Content (Split Screen) */}
              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Settings Panel */}
                <div className="lg:col-span-5 space-y-6">
                  {/* 1. Escolha de tamanho */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500 block">Tamanho da Etiqueta</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBadgeSize('A')}
                        className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between h-24 ${
                          isA 
                            ? 'border-indigo-500 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300' 
                            : 'border-slate-150 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="text-xs font-black uppercase tracking-wider">Opção A (14 p/ Folha)</span>
                        <span className="text-[10px] font-semibold leading-relaxed">
                          3,39 cm x 10,10 cm<br/>2 etiquetas por linha
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBadgeSize('B')}
                        className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between h-24 ${
                          !isA 
                            ? 'border-indigo-500 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300' 
                            : 'border-slate-150 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="text-xs font-black uppercase tracking-wider">Opção B (18 p/ Folha)</span>
                        <span className="text-[10px] font-semibold leading-relaxed">
                          4,66 cm x 6,35 cm<br/>3 etiquetas por linha
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Escolha de modo de preenchimento */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500 block">Formato de Saída (Impressora)</label>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setBadgePrintMode('single')}
                        className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          badgePrintMode === 'single'
                            ? 'border-indigo-500 bg-indigo-500/5 text-indigo-950 dark:text-indigo-200 font-bold'
                            : 'border-slate-100 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950/30'
                        }`}
                      >
                        <div className="text-xs">
                          <p className="font-black">Etiqueta Única</p>
                          <p className="text-[9px] text-slate-400 font-medium">Para impressoras térmicas / rolo de etiquetas</p>
                        </div>
                        {badgePrintMode === 'single' && <Check size={16} className="text-indigo-500" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setBadgePrintMode('full')}
                        className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          badgePrintMode === 'full'
                            ? 'border-indigo-500 bg-indigo-500/5 text-indigo-950 dark:text-indigo-200 font-bold'
                            : 'border-slate-100 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950/30'
                        }`}
                      >
                        <div className="text-xs">
                          <p className="font-black">Folha A4 Inteira</p>
                          <p className="text-[9px] text-slate-400 font-medium">Repete a mesma etiqueta em todas as {totalGridCells} posições</p>
                        </div>
                        {badgePrintMode === 'full' && <Check size={16} className="text-indigo-500" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setBadgePrintMode('specific')}
                        className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          badgePrintMode === 'specific'
                            ? 'border-indigo-500 bg-indigo-500/5 text-indigo-950 dark:text-indigo-200 font-bold'
                            : 'border-slate-100 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950/30'
                        }`}
                      >
                        <div className="text-xs">
                          <p className="font-black">Posição Específica na Folha A4</p>
                          <p className="text-[9px] text-slate-400 font-medium">Imprime em apenas 1 etiqueta para evitar desperdício de papel</p>
                        </div>
                        {badgePrintMode === 'specific' && <Check size={16} className="text-indigo-500" />}
                      </button>
                    </div>
                  </div>

                  {/* 3. Seletor de posição na folha */}
                  {badgePrintMode === 'specific' && (
                    <div className="space-y-3 animate-fade-in">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500 block">
                        Clique na posição que deseja imprimir:
                      </label>
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-150 dark:border-slate-850 flex items-center justify-center">
                        <div 
                          className={`grid gap-1 bg-slate-200 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 max-w-[200px] ${
                            isA ? 'grid-cols-2' : 'grid-cols-3'
                          }`}
                        >
                          {Array.from({ length: totalGridCells }).map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setBadgeSpecificPosition(idx)}
                              className={`w-10 h-8 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer ${
                                badgeSpecificPosition === idx
                                  ? 'bg-indigo-600 text-white shadow-sm scale-105'
                                  : 'bg-white dark:bg-slate-900 text-slate-450 dark:text-slate-550 hover:bg-indigo-50'
                              }`}
                            >
                              {idx + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Visual Preview Area */}
                <div className="lg:col-span-7 flex flex-col justify-between bg-slate-50 dark:bg-slate-950/60 p-6 rounded-[2rem] border border-slate-150 dark:border-slate-850">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pré-visualização em Tela</span>
                      <span className="text-[9px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Livre de Escala</span>
                    </div>

                    <div className="flex items-center justify-center py-6 min-h-[250px]">
                      {/* Interactive size container preview */}
                      <div 
                        className="shadow-xl rounded-2xl border border-slate-200 overflow-hidden bg-white max-w-full transition-all duration-300"
                        style={{
                          width: isA ? '420px' : '320px',
                          height: isA ? '141px' : '235px'
                        }}
                      >
                        {isA ? renderLabelA(selectedChildForBadge) : renderLabelB(selectedChildForBadge)}
                      </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-2xl text-[10px] text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
                      💡 <span className="font-black uppercase">Instruções de Impressão:</span> Defina as margens da impressora como <span className="font-bold">Nenhuma</span> e o tamanho do papel como <span className="font-bold">A4</span> (ou correspondente térmico) no diálogo de impressão do navegador para manter o alinhamento perfeito.
                    </div>
                  </div>

                  {/* Hidden print payload wrapper with complete stylesheet for print engine compatibility */}
                  <div style={{ display: 'none' }}>
                    <div id="print-section">
                      {/* Dynamic Print Stylesheet Injection */}
                      <style dangerouslySetInnerHTML={{ __html: `
                        @media print {
                          body * {
                            visibility: hidden !important;
                          }
                          #print-section, #print-section * {
                            visibility: visible !important;
                          }
                          #print-section {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 21.0cm !important;
                            height: 29.7cm !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                            display: block !important;
                            box-sizing: border-box !important;
                          }
                          @page {
                            size: ${badgePrintMode === 'single' ? (isA ? '10.10cm 3.39cm' : '6.35cm 4.66cm') : 'A4 portrait'} !important;
                            margin: 0 !important;
                          }
                        }
                      `}} />

                      {badgePrintMode === 'single' ? (
                        <div 
                          style={{ 
                            width: isA ? '10.10cm' : '6.35cm', 
                            height: isA ? '3.39cm' : '4.66cm', 
                            padding: '0.05cm',
                            boxSizing: 'border-box',
                            backgroundColor: 'white'
                          }}
                        >
                          {isA ? renderLabelA(selectedChildForBadge) : renderLabelB(selectedChildForBadge)}
                        </div>
                      ) : (
                        <div 
                          className="grid"
                          style={{
                            width: '21.0cm',
                            height: '29.7cm',
                            paddingLeft: isA ? '0.4cm' : '0.97cm',
                            paddingRight: isA ? '0.4cm' : '0.97cm',
                            paddingTop: isA ? '2.0cm' : '0.87cm',
                            paddingBottom: isA ? '2.0cm' : '0.87cm',
                            columnGap: '0.0cm',
                            rowGap: '0.0cm',
                            gridTemplateColumns: isA ? 'repeat(2, 10.10cm)' : 'repeat(3, 6.35cm)',
                            gridAutoRows: isA ? '3.39cm' : '4.66cm',
                            backgroundColor: 'white',
                            boxSizing: 'border-box'
                          }}
                        >
                          {Array.from({ length: totalGridCells }).map((_, index) => {
                            const shouldPrint = badgePrintMode === 'full' || (badgePrintMode === 'specific' && index === badgeSpecificPosition);
                            return (
                              <div 
                                key={index} 
                                style={{ 
                                  width: isA ? '10.10cm' : '6.35cm', 
                                  height: isA ? '3.39cm' : '4.66cm',
                                  padding: '0.05cm', 
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: 'white',
                                  boxSizing: 'border-box'
                                }}
                              >
                                {shouldPrint ? (
                                  isA ? renderLabelA(selectedChildForBadge) : renderLabelB(selectedChildForBadge)
                                ) : (
                                  <div className="w-full h-full opacity-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Print Action Triggers */}
                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-200/50">
                    <button 
                      onClick={() => setSelectedChildForBadge(null)}
                      className="px-5 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button 
                      onClick={() => window.print()}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={14} />
                      Enviar p/ Impressora
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
