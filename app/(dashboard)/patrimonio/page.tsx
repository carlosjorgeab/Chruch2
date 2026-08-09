'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useIgreja } from '@/context/IgrejaContext';
import { useConfirm } from '@/context/ConfirmContext';
import { Plus, Edit2, Trash2, Save, Search, Package, Layers, MapPin, BarChart3, AlertCircle, QrCode, ArrowLeft, Image as ImageIcon, Camera, History, FileText, Download, Calendar, X, ArrowRightLeft, UserCheck, Users, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const calculateDepreciation = (valor: number | null | undefined, data_aquisicao: string | null | undefined, estado: string) => {
  if (!valor) return 0;
  
  let currentValue = valor;
  
  if (data_aquisicao) {
    const aquisicao = new Date(data_aquisicao);
    const now = new Date();
    const ageInYears = (now.getTime() - aquisicao.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (ageInYears > 0) {
      const depreciationRate = 0.10; // 10% per year
      const factor = Math.max(0, 1 - (ageInYears * depreciationRate));
      currentValue = currentValue * factor;
    }
  }
  
  const stateMultiplier: Record<string, number> = {
    'NOVO': 1.0,
    'BOM': 0.8,
    'REGULAR': 0.5,
    'RUIM': 0.2,
    'SUCATA': 0.05
  };
  
  currentValue = currentValue * (stateMultiplier[estado] || 1.0);
  
  return currentValue;
};

export default function PatrimonioPage() {
  const { user, hasPermission } = useAuth();
  const { selectedIgreja } = useIgreja();
  const { confirmDelete } = useConfirm();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'bens' | 'categorias' | 'locais' | 'movimentacoes' | 'relatorios'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states (replacing popups)
  const [isEditingBem, setIsEditingBem] = useState(false);
  const [isEditingCategoria, setIsEditingCategoria] = useState(false);
  const [isEditingLocal, setIsEditingLocal] = useState(false);
  const [isEditingMovimentacao, setIsEditingMovimentacao] = useState(false);

  // Permission Checks
  const canReadPatrimonio = user?.id_master || user?.is_admin || hasPermission('/patrimonio') || hasPermission('patrimonio');
  const canEditPatrimonio = user?.id_master || user?.is_admin || hasPermission('patrimonio:editar') || hasPermission('patrimonio:novo') || hasPermission('patrimonio');
  const canReadCategorias = user?.id_master || user?.is_admin || hasPermission('/patrimonio_categorias') || hasPermission('patrimonio_categorias') || hasPermission('patrimonio');
  const canEditCategorias = user?.id_master || user?.is_admin || hasPermission('patrimonio_categorias:editar') || hasPermission('patrimonio_categorias:novo') || hasPermission('patrimonio_categorias');

  // State arrays
  const [categorias, setCategorias] = useState<any[]>([]);
  const [locais, setLocais] = useState<any[]>([]);
  const [bens, setBens] = useState<any[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [membros, setMembros] = useState<any[]>([]);

  // Current items
  const [currentCategoria, setCurrentCategoria] = useState<any>({ nome: '', descricao: '' });
  const [currentLocal, setCurrentLocal] = useState<any>({ nome: '', descricao: '', responsavel_id: '', co_responsavel_id: '' });
  const [currentBem, setCurrentBem] = useState<any>({
    nome: '', descricao: '', numero_tombamento: '', valor_aquisicao: '', data_aquisicao: '', 
    estado_conservacao: 'BOM', status: 'ATIVO', categoria_id: '', localizacao_id: '', foto_url: ''
  });
  const [currentMovimentacao, setCurrentMovimentacao] = useState<any>({
    patrimonio_id: '', tipo_movimentacao: 'MUDANCA_LOCAL', responsavel: '', responsavel_novo_id: '', co_responsavel_novo_id: '', nova_localizacao_id: '', observacao: '', data_movimentacao: new Date().toISOString().split('T')[0]
  });

  const [showQRModal, setShowQRModal] = useState(false);
  const [qrBem, setQrBem] = useState<any>(null);

  // Image Upload states
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Reports State
  const [relatorioTipo, setRelatorioTipo] = useState<'bens' | 'movimentacoes'>('bens');
  const [relatorioLocalizacao, setRelatorioLocalizacao] = useState('');
  const [relatorioDataInicial, setRelatorioDataInicial] = useState('');
  const [relatorioDataFinal, setRelatorioDataFinal] = useState('');
  const [relatorioResult, setRelatorioResult] = useState<any[] | null>(null);

  useEffect(() => {
    if (selectedIgreja?.id) {
      fetchData();
    }
  }, [selectedIgreja?.id]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchCategorias(),
      fetchLocais(),
      fetchBens(),
      fetchMovimentacoes(),
      fetchMembros()
    ]);
    setLoading(false);
  };

  const fetchMembros = async () => {
    if (!selectedIgreja?.id) return;
    const { data } = await supabase
      .from('membros')
      .select('id, nome')
      .eq('id_igreja', selectedIgreja.id)
      .order('nome');
    if (data) setMembros(data);
  };

  const fetchCategorias = async () => {
    if (!selectedIgreja?.id) return;
    const { data } = await supabase
      .from('patrimonio_categorias')
      .select('*')
      .eq('id_igreja', selectedIgreja.id)
      .order('nome');
    if (data) setCategorias(data);
  };

  const fetchLocais = async () => {
    if (!selectedIgreja?.id) return;
    const { data } = await supabase
      .from('patrimonio_localizacoes')
      .select('*')
      .eq('id_igreja', selectedIgreja.id)
      .order('nome');
    if (data) setLocais(data);
  };

  const fetchBens = async () => {
    if (!selectedIgreja?.id) return;
    const { data } = await supabase
      .from('patrimonios')
      .select('*, categoria:patrimonio_categorias(nome), local:patrimonio_localizacoes(nome)')
      .eq('id_igreja', selectedIgreja.id)
      .order('created_at', { ascending: false });
    if (data) setBens(data);
  };

  const fetchMovimentacoes = async () => {
    if (!selectedIgreja?.id) return;
    const { data } = await supabase
      .from('patrimonio_movimentacoes')
      .select('*, bem:patrimonios(nome, numero_tombamento)')
      .order('data_movimentacao', { ascending: false });
      
    if (data) setMovimentacoes(data);
  };

  // Upload Logic
  const handleFileSelection = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    const file = selectedFiles[0];
    
    setIsUploading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/financeiro/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro no servidor de upload.');
      }
      
      if (result.success && result.url) {
        setCurrentBem((prev: any) => ({ ...prev, foto_url: result.url }));
        setSuccess('Foto carregada com sucesso!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      console.error(err);
      setError('Erro ao enviar imagem.');
    } finally {
      setIsUploading(false);
      setIsDragging(false);
    }
  };

  // CRUD Categorias
  const handleSaveCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCategoria.nome) return setError('Nome da categoria é obrigatório.');
    
    const payload = {
      nome: currentCategoria.nome,
      descricao: currentCategoria.descricao,
      id_igreja: selectedIgreja?.id
    };

    if (currentCategoria.id) {
      await supabase.from('patrimonio_categorias').update(payload).eq('id', currentCategoria.id);
    } else {
      await supabase.from('patrimonio_categorias').insert([payload]);
    }
    
    setIsEditingCategoria(false);
    fetchCategorias();
    setSuccess('Categoria salva com sucesso!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteCategoria = async (id: string) => {
    confirmDelete({
      message: 'Tem certeza que deseja excluir esta categoria? Bens associados podem perder a referência.',
      onConfirm: async () => {
        await supabase.from('patrimonio_categorias').delete().eq('id', id);
        fetchCategorias();
      }
    });
  };

  // CRUD Locais
  const handleSaveLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLocal.nome) return setError('Nome do local é obrigatório.');
    
    const payload = {
      nome: currentLocal.nome,
      descricao: currentLocal.descricao,
      responsavel_id: currentLocal.responsavel_id || null,
      co_responsavel_id: currentLocal.co_responsavel_id || null,
      id_igreja: selectedIgreja?.id
    };

    if (currentLocal.id) {
      await supabase.from('patrimonio_localizacoes').update(payload).eq('id', currentLocal.id);
    } else {
      await supabase.from('patrimonio_localizacoes').insert([payload]);
    }
    
    setIsEditingLocal(false);
    fetchLocais();
    setSuccess('Local salvo com sucesso!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteLocal = async (id: string) => {
    confirmDelete({
      message: 'Tem certeza que deseja excluir este local?',
      onConfirm: async () => {
        await supabase.from('patrimonio_localizacoes').delete().eq('id', id);
        fetchLocais();
      }
    });
  };

  // CRUD Bens
  const handleSaveBem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBem.nome) return setError('Nome do bem é obrigatório.');
    if (!currentBem.categoria_id) return setError('Categoria é obrigatória.');
    
    // Validação de número de tombamento único dentro da mesma igreja
    if (currentBem.numero_tombamento && currentBem.numero_tombamento.trim()) {
      const tombamentoTrimmed = currentBem.numero_tombamento.trim();
      
      // 1. Verificação no estado local (feedback instantâneo)
      const duplicateInState = bens.find(b => 
        b.numero_tombamento && 
        b.numero_tombamento.trim().toLowerCase() === tombamentoTrimmed.toLowerCase() &&
        b.id !== currentBem.id &&
        (!selectedIgreja?.id || b.id_igreja === selectedIgreja.id)
      );

      if (duplicateInState) {
        setError(`O número de tombamento "${tombamentoTrimmed}" já está cadastrado nesta igreja.`);
        return;
      }

      // 2. Verificação direta no Supabase
      let query = supabase
        .from('patrimonios')
        .select('id, nome, numero_tombamento')
        .ilike('numero_tombamento', tombamentoTrimmed);

      if (selectedIgreja?.id) {
        query = query.eq('id_igreja', selectedIgreja.id);
      }

      if (currentBem.id) {
        query = query.neq('id', currentBem.id);
      }

      const { data: existingBens, error: checkErr } = await query;

      if (!checkErr && existingBens && existingBens.length > 0) {
        setError(`O número de tombamento "${tombamentoTrimmed}" já está cadastrado nesta igreja (Bem: ${existingBens[0].nome}).`);
        return;
      }
    }

    const payload = {
      nome: currentBem.nome,
      descricao: currentBem.descricao,
      numero_tombamento: currentBem.numero_tombamento ? currentBem.numero_tombamento.trim() : null,
      valor_aquisicao: currentBem.valor_aquisicao ? parseFloat(currentBem.valor_aquisicao) : null,
      data_aquisicao: currentBem.data_aquisicao || null,
      estado_conservacao: currentBem.estado_conservacao,
      status: currentBem.status,
      categoria_id: currentBem.categoria_id,
      localizacao_id: currentBem.localizacao_id || null,
      foto_url: currentBem.foto_url || null,
      id_igreja: selectedIgreja?.id,
      atualizado_por_nome: user?.nome,
      atualizado_em: new Date().toISOString()
    };

    if (currentBem.id) {
      await supabase.from('patrimonios').update(payload).eq('id', currentBem.id);
    } else {
      await supabase.from('patrimonios').insert([{ ...payload, criado_por_nome: user?.nome, criado_em: new Date().toISOString() }]);
    }
    
    setIsEditingBem(false);
    fetchBens();
    setSuccess('Bem salvo com sucesso!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteBem = async (id: string) => {
    confirmDelete({
      message: 'Tem certeza que deseja dar baixa/excluir este bem?',
      onConfirm: async () => {
        await supabase.from('patrimonios').delete().eq('id', id);
        fetchBens();
      }
    });
  };

  const handleQuickStatusChange = async (bem: any) => {
    const statuses = ['ATIVO', 'EM_MANUTENCAO', 'BAIXADO'];
    const currentIndex = statuses.indexOf(bem.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    
    setBens(prev => prev.map(b => b.id === bem.id ? { ...b, status: nextStatus } : b));

    const { error } = await supabase
      .from('patrimonios')
      .update({ 
        status: nextStatus,
        atualizado_por_nome: user?.nome,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', bem.id);
      
    if (error) {
      fetchBens();
      setError('Erro ao atualizar status.');
      setTimeout(() => setError(''), 3000);
    }
  };

  // CRUD Movimentações
  const handleSaveMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMovimentacao.patrimonio_id) return setError('Obrigatório selecionar o bem.');

    const bem = bens.find(b => b.id === currentMovimentacao.patrimonio_id);
    const currentLocation = locais.find(l => l.id === bem?.localizacao_id);
    const isLocationChange = ['MUDANCA_LOCAL', 'EMPRESTIMO', 'DEVOLUCAO'].includes(currentMovimentacao.tipo_movimentacao);

    const responsavel_novo_id = currentMovimentacao.responsavel_novo_id || currentMovimentacao.responsavel || null;
    const co_responsavel_novo_id = currentMovimentacao.co_responsavel_novo_id || null;
    const nova_loc_id = isLocationChange ? (currentMovimentacao.nova_localizacao_id || null) : null;

    if (!nova_loc_id && !responsavel_novo_id && !co_responsavel_novo_id) {
      return setError('Selecione pelo menos um dos campos: Nova Localização, Novo Responsável ou Novo Co-Responsável.');
    }

    const payload = {
      patrimonio_id: currentMovimentacao.patrimonio_id,
      tipo_movimentacao: currentMovimentacao.tipo_movimentacao,
      responsavel: responsavel_novo_id || currentLocation?.responsavel_id || user?.nome || 'Não Informado',
      responsavel_anterior_id: currentLocation?.responsavel_id || null,
      responsavel_novo_id: responsavel_novo_id,
      co_responsavel_anterior_id: currentLocation?.co_responsavel_id || null,
      co_responsavel_novo_id: co_responsavel_novo_id,
      localizacao_atual_id: bem?.localizacao_id || null,
      nova_localizacao_id: nova_loc_id,
      observacao: currentMovimentacao.observacao || '',
      data_movimentacao: currentMovimentacao.data_movimentacao,
    };

    if (currentMovimentacao.id) {
      await supabase.from('patrimonio_movimentacoes').update(payload).eq('id', currentMovimentacao.id);
    } else {
      await supabase.from('patrimonio_movimentacoes').insert([payload]);
    }

    // Update target location's responsable and co-responsable
    const targetLocationId = isLocationChange && currentMovimentacao.nova_localizacao_id 
      ? currentMovimentacao.nova_localizacao_id 
      : bem?.localizacao_id;

    if (targetLocationId) {
      const locUpdates: any = {};
      if (responsavel_novo_id) locUpdates.responsavel_id = responsavel_novo_id;
      if (co_responsavel_novo_id) locUpdates.co_responsavel_id = co_responsavel_novo_id;
      
      if (Object.keys(locUpdates).length > 0) {
        await supabase.from('patrimonio_localizacoes').update(locUpdates).eq('id', targetLocationId);
      }
    }

    if (isLocationChange && currentMovimentacao.nova_localizacao_id) {
       await supabase.from('patrimonios').update({
           localizacao_id: currentMovimentacao.nova_localizacao_id
       }).eq('id', currentMovimentacao.patrimonio_id);
    }

    if (currentMovimentacao.tipo_movimentacao === 'BAIXA') {
       await supabase.from('patrimonios').update({
           status: 'BAIXADO'
       }).eq('id', currentMovimentacao.patrimonio_id);
    }

    setIsEditingMovimentacao(false);
    fetchMovimentacoes();
    fetchBens();
    fetchLocais();
    setSuccess('Movimentação registrada com sucesso!');
    setTimeout(() => setSuccess(''), 3000);
  };
  
  const handleDeleteMovimentacao = async (id: string) => {
    confirmDelete({
      message: 'Tem certeza que deseja excluir esta movimentação do histórico?',
      onConfirm: async () => {
        await supabase.from('patrimonio_movimentacoes').delete().eq('id', id);
        fetchMovimentacoes();
      }
    });
  };

  // Helper formatters for Patrimonio reports and tables
  const formatMovimentacaoDate = (dt?: string | null) => {
    if (!dt) return '-';
    try {
      if (dt.includes('T')) {
        const d = new Date(dt);
        if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
      } else {
        const parts = dt.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      const d = new Date(dt);
      return isNaN(d.getTime()) ? dt : d.toLocaleDateString('pt-BR');
    } catch (e) {
      return dt;
    }
  };

  const getTipoMovimentacaoLabel = (tipo?: string | null) => {
    if (!tipo) return '-';
    const clean = tipo.toUpperCase().trim();
    switch (clean) {
      case 'MUDANCA_LOCAL':
      case 'MUDANÇA_LOCAL':
      case 'TRANSFERENCIA':
      case 'TRANSFERÊNCIA':
        return 'Transferência de Local';
      case 'TROCA_RESPONSAVEL':
      case 'TROCA_RESPONSÁVEL':
      case 'RESPONSAVEL':
      case 'RESPONSÁVEL':
        return 'Troca de Responsável';
      case 'AQUISICAO':
      case 'AQUISIÇÃO':
        return 'Aquisição / Entrada';
      case 'BAIXA':
        return 'Baixa de Patrimônio';
      case 'MANUTENCAO':
      case 'MANUTENÇÃO':
        return 'Manutenção';
      case 'EMPRESTIMO':
      case 'EMPRÉSTIMO':
        return 'Empréstimo';
      case 'MIGRACAO':
      case 'MIGRAÇÃO':
        return 'Migração / Ajuste';
      default:
        return tipo.replace(/_/g, ' ');
    }
  };

  const getLocalNomeById = (id?: string | null) => {
    if (!id) return null;
    const found = locais.find(l => l.id === id);
    return found ? found.nome : null;
  };

  const getBemNomeById = (id?: string | null) => {
    if (!id) return null;
    const found = bens.find(b => b.id === id);
    return found ? found.nome : null;
  };

  const getMembroNomeById = (idOrVal?: string | null) => {
    if (!idOrVal) return null;
    const found = membros.find(m => m.id === idOrVal);
    if (found) return found.nome;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrVal);
    if (!isUuid && idOrVal.trim().length > 0) return idOrVal;
    return null;
  };

  const getMovimentacaoLocalText = (m: any) => {
    const locAtual = m.localizacao_atual?.nome || getLocalNomeById(m.localizacao_atual_id);
    const locNovo = m.nova_localizacao?.nome || getLocalNomeById(m.nova_localizacao_id);

    if (locAtual && locNovo && locAtual !== locNovo) {
      return `${locAtual} ➔ ${locNovo}`;
    }
    if (locNovo) return locNovo;
    if (locAtual) return locAtual;
    return '-';
  };

  const getMovimentacaoResponsaveisText = (m: any) => {
    const respNovo = getMembroNomeById(m.responsavel_novo_id) || getMembroNomeById(m.responsavel) || m.responsavel;
    const coRespNovo = getMembroNomeById(m.co_responsavel_novo_id);
    const respAnt = getMembroNomeById(m.responsavel_anterior_id);
    const coRespAnt = getMembroNomeById(m.co_responsavel_anterior_id);

    let respLabel = respNovo || 'Não informado';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(respLabel)) {
      respLabel = 'Membro não identificado';
    }

    if (respAnt && respNovo && respAnt !== respNovo && !/^[0-9a-f]{8}-/i.test(respAnt)) {
      respLabel = `${respAnt} ➔ ${respLabel}`;
    }

    let coRespLabel = coRespNovo || '';
    if (coRespLabel && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(coRespLabel)) {
      coRespLabel = 'Co-Resp. não identificado';
    }
    if (coRespAnt && coRespNovo && coRespAnt !== coRespNovo && !/^[0-9a-f]{8}-/i.test(coRespAnt)) {
      coRespLabel = `${coRespAnt} ➔ ${coRespLabel}`;
    }

    if (coRespLabel) {
      return `Resp: ${respLabel}\nCo-Resp: ${coRespLabel}`;
    }
    return respLabel;
  };

  // Reports PDF Generation
  const generatePDFReport = (filteredList: any[], docTitle: string) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const churchName = selectedIgreja?.nome || 'IGREJA';
      const logoBase64 = selectedIgreja?.logo_url;
      const generationDate = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Filter description line
      let locName = 'Todas';
      if (relatorioLocalizacao) {
        const found = locais.find(l => l.id === relatorioLocalizacao);
        if (found) locName = found.nome;
      }
      
      let filterText = `Filtros: Localização: ${locName}`;
      if (relatorioTipo === 'movimentacoes') {
        const iniStr = relatorioDataInicial ? formatMovimentacaoDate(relatorioDataInicial) : 'Início';
        const fimStr = relatorioDataFinal ? formatMovimentacaoDate(relatorioDataFinal) : 'Atual';
        filterText += ` | Período: ${iniStr} até ${fimStr}`;
      }

      // Header block card (white fill, black stroke)
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(0, 0, 0); // Black border
      doc.setLineWidth(0.4);
      doc.rect(10, 10, 190, 26, 'FD');

      const logoSize = 12;
      let textStartX = 15;
      if (logoBase64) {
        try {
          let imageType = 'PNG';
          if (logoBase64.includes('data:image/jpeg') || logoBase64.includes('data:image/jpg') || logoBase64.includes('.jpg') || logoBase64.includes('.jpeg')) {
            imageType = 'JPEG';
          }
          doc.addImage(logoBase64, imageType, 14, 15, logoSize, logoSize);
          textStartX = 14 + logoSize + 4;
        } catch (err) {
          console.error("Error drawing logo", err);
        }
      }

      // Header Titles & Info
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(churchName.toUpperCase(), textStartX, 16);

      doc.setFontSize(9);
      doc.text(docTitle, textStartX, 22);

      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Gerado em: ${generationDate}  |  Total: ${filteredList.length} registro(s)`, textStartX, 27);
      doc.text(filterText, textStartX, 32);

      if (relatorioTipo === 'bens') {
        const tableHeaders = ['Nome do Bem', 'Tombamento', 'Localização', 'Categoria', 'Estado', 'Status', 'Valor (R$)'];
        const tableRows = filteredList.map(b => [
          b.nome || '-',
          b.numero_tombamento || '-',
          b.local?.nome || getLocalNomeById(b.localizacao_id) || '-',
          b.categoria?.nome || '-',
          b.estado_conservacao || '-',
          b.status || '-',
          b.valor_aquisicao ? parseFloat(b.valor_aquisicao).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'
        ]);

        autoTable(doc, {
          startY: 40,
          head: [tableHeaders],
          body: tableRows,
          theme: 'striped',
          headStyles: {
            fillColor: [0, 0, 0], // Pure Black background for header
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5,
            valign: 'middle',
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
          },
          bodyStyles: {
            fontSize: 8,
            valign: 'middle',
            textColor: [0, 0, 0],
            lineColor: [180, 180, 180],
            lineWidth: 0.1,
          },
          styles: {
            font: 'helvetica',
            cellPadding: 3,
          },
          columnStyles: {
            0: { cellWidth: 40, fontStyle: 'bold' },
            1: { cellWidth: 25 },
            2: { cellWidth: 30 },
            3: { cellWidth: 25 },
            4: { cellWidth: 22 },
            5: { cellWidth: 20 },
            6: { cellWidth: 28, halign: 'right' },
          }
        });
      } else {
        const tableHeaders = ['Data', 'Bem (Tombamento)', 'Tipo', 'Local Atual / Novo', 'Responsável e Co-Resp.', 'Observação'];
        const tableRows = filteredList.map(m => {
          const dtStr = formatMovimentacaoDate(m.data_movimentacao);
          const bemName = m.bem?.nome ? `${m.bem.nome}${m.bem.numero_tombamento ? ` (${m.bem.numero_tombamento})` : ''}` : (getBemNomeById(m.patrimonio_id) || '-');
          const tipoStr = getTipoMovimentacaoLabel(m.tipo_movimentacao);
          const locStr = getMovimentacaoLocalText(m);
          const respStr = getMovimentacaoResponsaveisText(m);
          return [
            dtStr,
            bemName,
            tipoStr,
            locStr,
            respStr,
            m.observacao || '-'
          ];
        });

        autoTable(doc, {
          startY: 40,
          head: [tableHeaders],
          body: tableRows,
          theme: 'striped',
          headStyles: {
            fillColor: [0, 0, 0],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5,
            valign: 'middle',
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
          },
          bodyStyles: {
            fontSize: 8,
            valign: 'middle',
            textColor: [0, 0, 0],
            lineColor: [180, 180, 180],
            lineWidth: 0.1,
          },
          styles: {
            font: 'helvetica',
            cellPadding: 3,
          },
          columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 38, fontStyle: 'bold' },
            2: { cellWidth: 28 },
            3: { cellWidth: 35 },
            4: { cellWidth: 35 },
            5: { cellWidth: 'auto' },
          }
        });
      }

      doc.save(`relatorio_patrimonio_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar relatório PDF.');
    }
  };

  const generateReport = () => {
    let filteredList: any[] = [];
    let docTitle = 'RELATÓRIO DE BENS PATRIMONIAIS';

    if (relatorioTipo === 'bens') {
      let filtered = bens;
      if (relatorioLocalizacao) {
        filtered = filtered.filter(b => b.localizacao_id === relatorioLocalizacao);
      }
      filteredList = filtered;
      setRelatorioResult(filtered);
    } else {
      docTitle = 'RELATÓRIO DE MOVIMENTAÇÕES DE PATRIMÔNIO';
      let filtered = movimentacoes;
      if (relatorioLocalizacao) {
        const bensInLoc = bens.filter(b => b.localizacao_id === relatorioLocalizacao).map(b => b.id);
        filtered = filtered.filter(m => bensInLoc.includes(m.patrimonio_id));
      }
      if (relatorioDataInicial) {
        filtered = filtered.filter(m => new Date(m.data_movimentacao) >= new Date(relatorioDataInicial));
      }
      if (relatorioDataFinal) {
        filtered = filtered.filter(m => new Date(m.data_movimentacao) <= new Date(relatorioDataFinal));
      }
      filteredList = filtered;
      setRelatorioResult(filtered);
    }

    // Immediately trigger PDF generation with church header
    generatePDFReport(filteredList, docTitle);
  };

  if (!canReadPatrimonio) {
    return <div className="p-8 text-center text-slate-500">Você não tem permissão para acessar este módulo.</div>;
  }

  const totalBens = bens.length;
  const bensAtivos = bens.filter(b => b.status === "ATIVO").length;
  const bensManutencao = bens.filter(b => b.status === "EM_MANUTENCAO").length;
  const valorTotal = bens.reduce((acc, curr) => acc + (parseFloat(curr.valor_aquisicao) || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" />
            Gestão de Patrimônio
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Controle de inventário, móveis e equipamentos
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-600 rounded-xl flex items-center gap-2 border border-rose-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl flex items-center gap-2 border border-emerald-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Tabs */}
      {(!isEditingBem && !isEditingCategoria && !isEditingLocal && !isEditingMovimentacao) && (
        <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
            <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Visão Geral</div>
          </button>
          <button onClick={() => setActiveTab('bens')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'bens' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
            <div className="flex items-center gap-2"><Package className="w-4 h-4" /> Bens e Ativos</div>
          </button>
          {canReadCategorias && (
            <>
              <button onClick={() => setActiveTab('categorias')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'categorias' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                <div className="flex items-center gap-2"><Layers className="w-4 h-4" /> Categorias</div>
              </button>
              <button onClick={() => setActiveTab('locais')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'locais' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Localizações</div>
              </button>
              <button onClick={() => setActiveTab('movimentacoes')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'movimentacoes' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                <div className="flex items-center gap-2"><History className="w-4 h-4" /> Movimentações</div>
              </button>
              <button onClick={() => setActiveTab('relatorios')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'relatorios' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                <div className="flex items-center gap-2"><FileText className="w-4 h-4" /> Relatórios</div>
              </button>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && !isEditingBem && !isEditingCategoria && !isEditingLocal && !isEditingMovimentacao && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Bens</span>
                <span className="text-3xl font-black text-slate-800 dark:text-white">{totalBens}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Bens Ativos</span>
                <span className="text-3xl font-black text-slate-800 dark:text-white">{bensAtivos}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Em Manutenção</span>
                <span className="text-3xl font-black text-slate-800 dark:text-white">{bensManutencao}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Valor Total Estimado</span>
                <span className="text-3xl font-black text-slate-800 dark:text-white">
                  R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* TAB: BENS */}
          {activeTab === 'bens' && !isEditingBem && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, tombamento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                {canEditPatrimonio && (
                  <button
                    onClick={() => {
                      setCurrentBem({
                        nome: '', descricao: '', numero_tombamento: '', valor_aquisicao: '', data_aquisicao: '', 
                        estado_conservacao: 'BOM', status: 'ATIVO', categoria_id: '', localizacao_id: '', foto_url: ''
                      });
                      setIsEditingBem(true);
                    }}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-2xl transition-all shadow-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Novo Bem
                  </button>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Bem</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Local / Categoria</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Tombamento</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {bens
                      .filter(b => b.nome.toLowerCase().includes(searchTerm.toLowerCase()) || (b.numero_tombamento || '').toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((bem) => (
                      <tr key={bem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-white p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 cursor-pointer hover:shadow-md transition-all" onClick={() => { setQrBem(bem); setShowQRModal(true); }}>
                              {bem.foto_url ? (
                                <img src={bem.foto_url} alt={bem.nome} className="w-8 h-8 object-cover rounded" />
                              ) : (
                                <QRCodeSVG value={`patrimonio:${bem.id}`} size={32} />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white text-sm">{bem.nome}</p>
                              {bem.valor_aquisicao && (
                                <div className="mt-1 flex flex-col gap-0.5">
                                  <span className="text-xs text-slate-400 line-through">Aq: R$ {parseFloat(bem.valor_aquisicao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  <span className="text-xs font-bold text-amber-600 dark:text-amber-500">
                                    Atual: R$ {calculateDepreciation(parseFloat(bem.valor_aquisicao), bem.data_aquisicao, bem.estado_conservacao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{bem.local?.nome || '-'}</p>
                          <p className="text-xs text-slate-400">{bem.categoria?.nome || '-'}</p>
                        </td>
                        <td className="p-4 text-sm text-slate-500 font-mono">
                          {bem.numero_tombamento || '-'}
                        </td>
                        <td className="p-4">
                          <AnimatePresence mode="popLayout">
                            <motion.button
                              key={bem.status}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.8, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              onClick={() => canEditPatrimonio && handleQuickStatusChange(bem)}
                              disabled={!canEditPatrimonio}
                              className={`inline-block focus:outline-none ${canEditPatrimonio ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                            >
                              <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                                bem.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-700' :
                                bem.status === 'EM_MANUTENCAO' ? 'bg-amber-100 text-amber-700' :
                                bem.status === 'BAIXADO' ? 'bg-rose-100 text-rose-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {bem.status}
                              </span>
                            </motion.button>
                          </AnimatePresence>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setQrBem(bem);
                                setShowQRModal(true);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                              title="QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                            {canEditPatrimonio && (
                              <>
                                <button
                                  onClick={() => {
                                    setCurrentBem(bem);
                                    setIsEditingBem(true);
                                  }}
                                  className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBem(bem.id)}
                                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {bens.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                          Nenhum bem cadastrado ou encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FORM: BEM */}
          {isEditingBem && (
            <motion.form 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
              onSubmit={handleSaveBem} 
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                  <button type="button" onClick={() => setIsEditingBem(false)} className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {currentBem.id ? 'Editar Cadastro de Bem' : 'Novo Cadastro de Bem'}
                </h3>
              </div>
              
              <fieldset disabled={currentBem.status === 'BAIXADO'} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Imagem do Bem */}
                <div className="lg:col-span-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#E4A232]">Foto do Bem</h4>
                </div>
                <div className="lg:col-span-3 flex gap-6 items-start">
                  <div className="w-32 h-32 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden relative group">
                    {currentBem.foto_url ? (
                      <img src={currentBem.foto_url} alt="Prévia" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Sem foto</span>
                      </div>
                    )}
                    <button type="button" onClick={() => document.getElementById('bem-photo-upload')?.click()} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Camera className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div
                      onDragOver={(e) => { e.preventDefault(); if (!isUploading) setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (!isUploading && e.dataTransfer.files.length) handleFileSelection(Array.from(e.dataTransfer.files)); }}
                      onClick={() => !isUploading && document.getElementById('bem-photo-upload')?.click()}
                      className={`p-4 rounded-xl border-2 border-dashed transition-all duration-200 text-center flex flex-col items-center justify-center gap-2 ${isDragging ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 cursor-pointer' : isUploading ? 'opacity-50 cursor-wait' : 'border-slate-200 dark:border-slate-700 hover:border-amber-500 cursor-pointer'}`}
                    >
                      <input id="bem-photo-upload" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFileSelection(Array.from(e.target.files))} />
                      <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mb-1">
                        <Camera size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Clique para buscar ou arraste uma foto</p>
                        <p className="text-xs text-slate-500 mt-1">PNG, JPG até 5MB</p>
                      </div>
                    </div>
                    {currentBem.foto_url && (
                      <button type="button" onClick={() => setCurrentBem({ ...currentBem, foto_url: '' })} className="text-xs text-rose-500 font-bold hover:underline">Remover Imagem</button>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-3 border-b border-slate-100 dark:border-slate-800 pb-2 mt-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#E4A232]">I. Identificação do Bem</h4>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome do Bem *</label>
                  <input type="text" required value={currentBem.nome} onChange={(e) => setCurrentBem({ ...currentBem, nome: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nº Tombamento / Plaqueta</label>
                  <input type="text" value={currentBem.numero_tombamento || ''} onChange={(e) => setCurrentBem({ ...currentBem, numero_tombamento: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Categoria *</label>
                  <select required value={currentBem.categoria_id || ''} onChange={(e) => setCurrentBem({ ...currentBem, categoria_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium">
                    <option value="">Selecione...</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Localização</label>
                  <select disabled={currentBem.id && movimentacoes.some(m => m.patrimonio_id === currentBem.id && ['MUDANCA_LOCAL', 'EMPRESTIMO', 'DEVOLUCAO'].includes(m.tipo_movimentacao))} value={currentBem.localizacao_id || ''} onChange={(e) => setCurrentBem({ ...currentBem, localizacao_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="">Selecione...</option>
                    {locais.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  {currentBem.id && movimentacoes.some(m => m.patrimonio_id === currentBem.id && ['MUDANCA_LOCAL', 'EMPRESTIMO', 'DEVOLUCAO'].includes(m.tipo_movimentacao)) && (
                    <p className="text-[9px] text-amber-500 mt-1 font-bold ml-1">Bloqueado devido a movimentações de local registradas.</p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Status Atual</label>
                  <select value={currentBem.status} onChange={(e) => setCurrentBem({ ...currentBem, status: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium">
                    <option value="ATIVO">Ativo</option>
                    <option value="EM_MANUTENCAO">Em Manutenção</option>
                    <option value="EMPRESTADO">Emprestado</option>
                    <option value="BAIXADO">Baixado</option>
                  </select>
                </div>

                <div className="lg:col-span-3 border-b border-slate-100 dark:border-slate-800 pb-2 mt-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#E4A232]">II. Valores e Aquisição</h4>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Data da Aquisição</label>
                  <input type="date" value={currentBem.data_aquisicao ? currentBem.data_aquisicao.split('T')[0] : ''} onChange={(e) => setCurrentBem({ ...currentBem, data_aquisicao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Valor Aquisição (R$)</label>
                  <input type="number" step="0.01" value={currentBem.valor_aquisicao || ''} onChange={(e) => setCurrentBem({ ...currentBem, valor_aquisicao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Estado de Conservação</label>
                  <select value={currentBem.estado_conservacao} onChange={(e) => setCurrentBem({ ...currentBem, estado_conservacao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium">
                    <option value="NOVO">Novo</option>
                    <option value="BOM">Bom</option>
                    <option value="REGULAR">Regular</option>
                    <option value="RUIM">Ruim</option>
                    <option value="SUCATA">Sucata</option>
                  </select>
                </div>

                <div className="lg:col-span-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição / Observações</label>
                  <textarea rows={3} value={currentBem.descricao || ''} onChange={(e) => setCurrentBem({ ...currentBem, descricao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>
                
                {/* Auditoria / Log do Patrimônio */}
                {currentBem.id && (
                  <>
                    <div className="lg:col-span-3 border-b border-slate-100 dark:border-slate-800 pb-2 mt-2">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#E4A232]">III. Histórico de Cadastro</h4>
                    </div>
                    <div className="lg:col-span-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-100 dark:border-slate-700">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Criado por</p>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{currentBem.criado_por_nome || 'Sistema'} em {new Date(currentBem.criado_em || currentBem.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Última Atualização por</p>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {currentBem.atualizado_por_nome || 'N/A'} {currentBem.atualizado_em ? `em ${new Date(currentBem.atualizado_em).toLocaleString('pt-BR')}` : ''}
                        </p>
                      </div>
                    </div>
                  </>
                )}

              </fieldset>
              <div className="mt-8 flex justify-end gap-4">
                <button type="button" onClick={() => setIsEditingBem(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
                {currentBem.status !== 'BAIXADO' && (
                  <button type="submit" className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-2xl shadow-sm flex items-center gap-2"><Save className="w-4 h-4" /> Salvar Cadastro</button>
                )}
              </div>
            </motion.form>
          )}

          {/* TAB: CATEGORIAS */}
          {activeTab === 'categorias' && !isEditingCategoria && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Layers className="w-5 h-5 text-amber-500"/> Categorias de Patrimônio</h3>
                {canEditCategorias && (
                  <button
                    onClick={() => {
                      setCurrentCategoria({ nome: '', descricao: '' });
                      setIsEditingCategoria(true);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Nova Categoria
                  </button>
                )}
              </div>
              <div className="p-6">
                <div className="grid gap-3">
                  {categorias.map(cat => (
                    <div key={cat.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{cat.nome}</p>
                        {cat.descricao && <p className="text-xs text-slate-500">{cat.descricao}</p>}
                      </div>
                      {canEditCategorias && (
                        <div className="flex gap-2">
                          <button onClick={() => { setCurrentCategoria(cat); setIsEditingCategoria(true); }} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteCategoria(cat.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  ))}
                  {categorias.length === 0 && <p className="text-center text-slate-500 text-sm py-8">Nenhuma categoria cadastrada.</p>}
                </div>
              </div>
            </div>
          )}

          {/* FORM: CATEGORIA */}
          {isEditingCategoria && (
            <motion.form 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
              onSubmit={handleSaveCategoria} 
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 max-w-2xl"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                <button type="button" onClick={() => setIsEditingCategoria(false)} className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {currentCategoria.id ? 'Editar Categoria' : 'Nova Categoria'}
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome da Categoria *</label>
                  <input required type="text" value={currentCategoria.nome} onChange={(e) => setCurrentCategoria({ ...currentCategoria, nome: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição</label>
                  <textarea rows={3} value={currentCategoria.descricao || ''} onChange={(e) => setCurrentCategoria({ ...currentCategoria, descricao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-4">
                <button type="button" onClick={() => setIsEditingCategoria(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-2xl shadow-sm flex items-center gap-2"><Save className="w-4 h-4" /> Salvar</button>
              </div>
            </motion.form>
          )}

          {/* TAB: LOCAIS */}
          {activeTab === 'locais' && !isEditingLocal && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><MapPin className="w-5 h-5 text-amber-500"/> Localizações Físicas</h3>
                {canEditCategorias && (
                  <button
                    onClick={() => {
                      setCurrentLocal({ nome: '', descricao: '', responsavel_id: '', co_responsavel_id: '' });
                      setIsEditingLocal(true);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Novo Local
                  </button>
                )}
              </div>
              <div className="p-6">
                <div className="grid gap-3">
                  {locais.map(loc => {
                    const resp = membros.find(m => m.id === loc.responsavel_id);
                    const coResp = membros.find(m => m.id === loc.co_responsavel_id);
                    return (
                      <div key={loc.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{loc.nome}</p>
                          {loc.descricao && <p className="text-xs text-slate-500 mb-1">{loc.descricao}</p>}
                          <div className="flex flex-wrap gap-2 mt-2 text-xs">
                            <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg font-medium flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5" /> Responsável: {resp?.nome || 'Não definido'}
                            </span>
                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg font-medium flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" /> Co-Responsável: {coResp?.nome || 'Não definido'}
                            </span>
                          </div>
                        </div>
                        {canEditCategorias && (
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => { setCurrentLocal(loc); setIsEditingLocal(true); }} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteLocal(loc.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {locais.length === 0 && <p className="text-center text-slate-500 text-sm py-8">Nenhum local cadastrado.</p>}
                </div>
              </div>
            </div>
          )}

          {/* FORM: LOCAL */}
          {isEditingLocal && (
            <motion.form 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
              onSubmit={handleSaveLocal} 
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 max-w-2xl"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                <button type="button" onClick={() => setIsEditingLocal(false)} className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {currentLocal.id ? 'Editar Local' : 'Novo Local'}
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome do Local *</label>
                  <input required type="text" value={currentLocal.nome || ''} onChange={(e) => setCurrentLocal({ ...currentLocal, nome: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição</label>
                  <textarea rows={3} value={currentLocal.descricao || ''} onChange={(e) => setCurrentLocal({ ...currentLocal, descricao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Responsável (Membro)</label>
                  <select
                    value={currentLocal.responsavel_id || ''}
                    onChange={(e) => setCurrentLocal({ ...currentLocal, responsavel_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium"
                  >
                    <option value="">Selecione um Membro...</option>
                    {membros.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Co-Responsável (Membro)</label>
                  <select
                    value={currentLocal.co_responsavel_id || ''}
                    onChange={(e) => setCurrentLocal({ ...currentLocal, co_responsavel_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium"
                  >
                    <option value="">Selecione um Membro...</option>
                    {membros.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-4">
                <button type="button" onClick={() => setIsEditingLocal(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-2xl shadow-sm flex items-center gap-2"><Save className="w-4 h-4" /> Salvar</button>
              </div>
            </motion.form>
          )}

          {/* TAB: MOVIMENTAÇÕES */}
          {activeTab === 'movimentacoes' && !isEditingMovimentacao && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-amber-500"/> Histórico de Movimentações</h3>
                {canEditPatrimonio && (
                  <button
                    onClick={() => {
                      setCurrentMovimentacao({ patrimonio_id: '', tipo_movimentacao: 'MUDANCA_LOCAL', responsavel: user?.nome || '', responsavel_novo_id: '', co_responsavel_novo_id: '', observacao: '', data_movimentacao: new Date().toISOString().split('T')[0] });
                      setIsEditingMovimentacao(true);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Registrar Movimentação
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Data</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Bem</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Tipo</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Local Atual / Novo</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Responsável e Co-Resp.</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {movimentacoes.map(mov => (
                      <tr key={mov.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 text-sm font-medium text-slate-900 dark:text-white">
                          {formatMovimentacaoDate(mov.data_movimentacao)}
                        </td>
                        <td className="p-4 font-bold text-slate-900 dark:text-white text-sm">
                          {mov.bem?.nome ? `${mov.bem.nome}${mov.bem.numero_tombamento ? ` (${mov.bem.numero_tombamento})` : ''}` : (getBemNomeById(mov.patrimonio_id) || '-')}
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            mov.tipo_movimentacao === 'AQUISICAO' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                            mov.tipo_movimentacao === 'MUDANCA_LOCAL' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                            mov.tipo_movimentacao === 'MANUTENCAO' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                            mov.tipo_movimentacao === 'EMPRESTIMO' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {getTipoMovimentacaoLabel(mov.tipo_movimentacao)}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300 font-medium">
                          {getMovimentacaoLocalText(mov)}
                        </td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300 font-medium whitespace-pre-line">
                          {getMovimentacaoResponsaveisText(mov)}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canEditPatrimonio && (
                              <button
                                onClick={() => handleDeleteMovimentacao(mov.id)}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {movimentacoes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">Nenhuma movimentação registrada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FORM: MOVIMENTAÇÃO */}
          {isEditingMovimentacao && (() => {
            const selectedBem = bens.find(b => b.id === currentMovimentacao.patrimonio_id);
            const selectedLocation = locais.find(l => l.id === selectedBem?.localizacao_id);

            const locationAtualText = selectedLocation 
              ? selectedLocation.nome 
              : (selectedBem?.localizacao_id ? 'Localização cadastrada no bem' : 'Sem localização definida');

            const respAtualText = selectedLocation?.responsavel_id 
              ? (membros.find(m => m.id === selectedLocation.responsavel_id)?.nome || 'Membro não encontrado')
              : 'Nenhum responsável definido na localização';

            const coRespAtualText = selectedLocation?.co_responsavel_id 
              ? (membros.find(m => m.id === selectedLocation.co_responsavel_id)?.nome || 'Membro não encontrado')
              : 'Nenhum co-responsável definido na localização';

            return (
              <motion.form 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                onSubmit={handleSaveMovimentacao} 
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 max-w-3xl"
              >
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <button type="button" onClick={() => setIsEditingMovimentacao(false)} className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Registrar Movimentação
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Bem Patrimonial *</label>
                    <select required value={currentMovimentacao.patrimonio_id} onChange={(e) => setCurrentMovimentacao({ ...currentMovimentacao, patrimonio_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium">
                      <option value="">Selecione um bem...</option>
                      {bens.map(b => <option key={b.id} value={b.id}>{b.nome} {b.numero_tombamento ? `(${b.numero_tombamento})` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tipo de Movimentação *</label>
                    <select required value={currentMovimentacao.tipo_movimentacao} onChange={(e) => setCurrentMovimentacao({ ...currentMovimentacao, tipo_movimentacao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium">
                      <option value="MUDANCA_LOCAL">Mudança de Local</option>
                      <option value="EMPRESTIMO">Empréstimo</option>
                      <option value="DEVOLUCAO">Devolução</option>
                      <option value="MANUTENCAO">Envio p/ Manutenção</option>
                      <option value="BAIXA">Baixa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Data *</label>
                    <input required type="date" value={currentMovimentacao.data_movimentacao} onChange={(e) => setCurrentMovimentacao({ ...currentMovimentacao, data_movimentacao: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                  </div>

                  {/* Localização Section */}
                  {['MUDANCA_LOCAL', 'EMPRESTIMO', 'DEVOLUCAO'].includes(currentMovimentacao.tipo_movimentacao) && (
                    <div className="md:col-span-2 space-y-3 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Localização Atual (Não editável)</label>
                        <div className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold text-sm select-none cursor-not-allowed flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>{locationAtualText}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nova Localização (Opcional)</label>
                        <select value={currentMovimentacao.nova_localizacao_id || ''} onChange={(e) => setCurrentMovimentacao({ ...currentMovimentacao, nova_localizacao_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium">
                          <option value="">Selecione a Nova Localização (Opcional)</option>
                          {locais.map((l: any) => (
                            <option key={l.id} value={l.id}>{l.nome}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Responsável Section */}
                  <div className="md:col-span-2 space-y-3 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Responsável Atual (Recuperado da Localização - Não editável)</label>
                      <div className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold text-sm select-none cursor-not-allowed flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>{respAtualText}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Novo Responsável (Membro - Opcional)</label>
                      <select value={currentMovimentacao.responsavel_novo_id || currentMovimentacao.responsavel || ''} onChange={(e) => setCurrentMovimentacao({ ...currentMovimentacao, responsavel_novo_id: e.target.value, responsavel: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium">
                        <option value="">Selecione o Membro Responsável (Opcional)</option>
                        {membros.map((m: any) => (
                          <option key={m.id} value={m.id}>{m.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Co-Responsável Section */}
                  <div className="md:col-span-2 space-y-3 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Co-Responsável Atual (Recuperado da Localização - Não editável)</label>
                      <div className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold text-sm select-none cursor-not-allowed flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>{coRespAtualText}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Novo Co-Responsável (Membro)</label>
                      <select value={currentMovimentacao.co_responsavel_novo_id || ''} onChange={(e) => setCurrentMovimentacao({ ...currentMovimentacao, co_responsavel_novo_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium">
                        <option value="">Selecione o Membro Co-Responsável (Opcional)</option>
                        {membros.map((m: any) => (
                          <option key={m.id} value={m.id}>{m.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Observações</label>
                    <textarea rows={3} value={currentMovimentacao.observacao || ''} onChange={(e) => setCurrentMovimentacao({ ...currentMovimentacao, observacao: e.target.value })} placeholder="Destino, motivo do empréstimo, detalhes do defeito, etc." className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-4">
                  <button type="button" onClick={() => setIsEditingMovimentacao(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
                  <button type="submit" className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-2xl shadow-sm flex items-center gap-2"><Save className="w-4 h-4" /> Registrar Movimentação</button>
                </div>
              </motion.form>
            );
          })()}

          {/* TAB: RELATÓRIOS */}
          {activeTab === 'relatorios' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6"><FileText className="w-5 h-5 text-amber-500"/> Relatórios de Patrimônio</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tipo de Relatório</label>
                    <select value={relatorioTipo} onChange={(e) => { setRelatorioTipo(e.target.value as any); setRelatorioResult(null); }} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium">
                      <option value="bens">Bens Patrimoniais</option>
                      <option value="movimentacoes">Bens Movimentados</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Filtro: Localização</label>
                    <select value={relatorioLocalizacao} onChange={(e) => setRelatorioLocalizacao(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium">
                      <option value="">Todas</option>
                      {locais.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  
                  {relatorioTipo === 'movimentacoes' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Data Inicial</label>
                        <input type="date" value={relatorioDataInicial} onChange={(e) => setRelatorioDataInicial(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Data Final</label>
                        <input type="date" value={relatorioDataFinal} onChange={(e) => setRelatorioDataFinal(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-medium" />
                      </div>
                    </>
                  )}
                  
                  <div className={relatorioTipo === 'bens' ? 'md:col-span-2' : ''}>
                    <button onClick={generateReport} className="w-full px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow-sm transition-all flex justify-center items-center gap-2">
                      <Search className="w-4 h-4" /> Gerar Relatório
                    </button>
                  </div>
                </div>
              </div>
              
              {relatorioResult && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Resultado ({relatorioResult.length} registros)</h4>
                    <button onClick={() => generatePDFReport(relatorioResult, relatorioTipo === 'bens' ? 'RELATÓRIO DE BENS PATRIMONIAIS' : 'RELATÓRIO DE MOVIMENTAÇÕES DE PATRIMÔNIO')} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer"><Download className="w-3 h-3"/> Baixar PDF</button>
                  </div>
                  
                  <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-left border-collapse print:text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                          {relatorioTipo === 'bens' ? (
                            <>
                              <th className="p-3 text-xs font-black text-slate-500 uppercase tracking-wider">Nome do Bem</th>
                              <th className="p-3 text-xs font-black text-slate-500 uppercase tracking-wider">Tombamento</th>
                              <th className="p-3 text-xs font-black text-slate-500 uppercase tracking-wider">Local / Categoria</th>
                              <th className="p-3 text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                            </>
                          ) : (
                            <>
                              <th className="p-3 text-xs font-black text-slate-500 uppercase tracking-wider">Data</th>
                              <th className="p-3 text-xs font-black text-slate-500 uppercase tracking-wider">Bem</th>
                              <th className="p-3 text-xs font-black text-slate-500 uppercase tracking-wider">Tipo</th>
                              <th className="p-3 text-xs font-black text-slate-500 uppercase tracking-wider">Local Atual / Novo</th>
                              <th className="p-3 text-xs font-black text-slate-500 uppercase tracking-wider">Responsável e Co-Resp.</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {relatorioResult.map((item, idx) => (
                          <tr key={item.id || idx}>
                            {relatorioTipo === 'bens' ? (
                              <>
                                <td className="p-3 font-bold text-slate-900 dark:text-white text-sm">{item.nome}</td>
                                <td className="p-3 text-sm text-slate-500 font-mono">{item.numero_tombamento || '-'}</td>
                                <td className="p-3 text-sm text-slate-600 dark:text-slate-300">{item.local?.nome || getLocalNomeById(item.localizacao_id) || '-'} / {item.categoria?.nome || '-'}</td>
                                <td className="p-3 text-xs font-bold">{item.status}</td>
                              </>
                            ) : (
                              <>
                                <td className="p-3 text-sm">{formatMovimentacaoDate(item.data_movimentacao)}</td>
                                <td className="p-3 font-bold text-slate-900 dark:text-white text-sm">{item.bem?.nome ? `${item.bem.nome}${item.bem.numero_tombamento ? ` (${item.bem.numero_tombamento})` : ''}` : (getBemNomeById(item.patrimonio_id) || '-')}</td>
                                <td className="p-3 text-sm font-medium">{getTipoMovimentacaoLabel(item.tipo_movimentacao)}</td>
                                <td className="p-3 text-sm text-slate-600 dark:text-slate-300">{getMovimentacaoLocalText(item)}</td>
                                <td className="p-3 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">{getMovimentacaoResponsaveisText(item)}</td>
                              </>
                            )}
                          </tr>
                        ))}
                        {relatorioResult.length === 0 && (
                          <tr><td colSpan={5} className="p-6 text-center text-slate-500">Nenhum resultado encontrado para os filtros.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* MODAL: QR CODE */}
      {showQRModal && qrBem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowQRModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-8 text-center space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{qrBem.nome}</h3>
            <div className="bg-white p-4 rounded-2xl inline-block shadow-sm">
              <QRCodeSVG value={`patrimonio:${qrBem.id}`} size={200} />
            </div>
            <p className="text-xs text-slate-500 font-mono">{qrBem.numero_tombamento || 'S/N'}</p>
            <button onClick={() => setShowQRModal(false)} className="w-full px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl">Fechar</button>
          </div>
        </div>
      )}

    </div>
  );
}
