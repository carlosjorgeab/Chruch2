'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useIgreja } from '@/context/IgrejaContext';
import { useAuth } from '@/context/AuthContext';
import { useConfirm } from '@/context/ConfirmContext';
import { Plus, Edit2, Trash2, Save, X, Search, Check, RefreshCw, UserCheck, FileText, Calendar, Printer, Upload, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCPF, formatTelefone, formatCEP, validateCPF } from '@/lib/masks';

type Membro = {
  id: string;
  id_igreja: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  status: 'Ativo' | 'Inativo' | 'Visitante';
  batizado_aguas: boolean;
  batizado_espirito: boolean;
  cargo: string | null;
  foto_url: string | null;
  cpf: string | null;
  sexo: string | null;
  estado_civil: string | null;
  escolaridade: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  id_uf: string | null;
  cep: string | null;
  pais: string | null;
  recepcao: string | null;
  categoria: string | null;
  data_batismo: string | null;
  data_conversao: string | null;
  id_conjuge: string | null;
  id_grupo: string | null;
  id_comunidade: string | null;
  criado_por_nome: string | null;
  criado_em: string | null;
  atualizado_por_nome: string | null;
  atualizado_em: string | null;
};

type UfInfo = {
  id: string;
  nome: string;
  sigla: string;
};

type GrupoInfo = {
  id: string;
  nome: string;
};

const calculateAge = (birthdate: string | null | undefined): string => {
  if (!birthdate) return '-';
  try {
    const birth = new Date(birthdate + 'T00:00:00');
    if (isNaN(birth.getTime())) return '-';
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? `${age} anos` : '-';
  } catch (e) {
    return '-';
  }
};

export default function MembrosPage() {
  const { selectedIgreja } = useIgreja();
  const { user, hasPermission } = useAuth();
  const { confirmDelete } = useConfirm();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [ufs, setUfs] = useState<UfInfo[]>([]);
  const [grupos, setGrupos] = useState<GrupoInfo[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [sexoFilter, setSexoFilter] = useState<string>('todos');
  const [estadoCivilFilter, setEstadoCivilFilter] = useState<string>('todos');
  const [mesNascimentoFilter, setMesNascimentoFilter] = useState<string>('todos');

  const [currentMembro, setCurrentMembro] = useState<Partial<Membro>>({
    nome: '',
    email: '',
    telefone: '',
    data_nascimento: '',
    status: 'Ativo',
    batizado_aguas: false,
    batizado_espirito: false,
    cargo: 'Membro',
    foto_url: '',
    cpf: '',
    sexo: 'Masculino',
    estado_civil: 'Solteiro(a)',
    escolaridade: 'Ensino Médio Completo',
    endereco: '',
    bairro: '',
    cidade: '',
    id_uf: '',
    cep: '',
    pais: 'Brasil',
    recepcao: 'Batismo',
    categoria: 'Adulto',
    data_batismo: '',
    data_conversao: '',
    id_conjuge: '',
    id_grupo: '',
    id_comunidade: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelection = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    const file = selectedFiles[0]; // ONLY ONE foto de perfil
    
    setIsUploading(true);
    setError('');
    setSuccess('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/financeiro/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro inesperado no servidor de carregamento.');
      }
      
      if (result.success && result.url) {
        setCurrentMembro(prev => ({ ...prev, foto_url: result.url }));
        setSuccess(`Sucesso: "${file.name}" foi salvo com segurança e definido como foto de perfil!`);
      } else {
        throw new Error('Formato de resposta inválido do servidor ao carregar.');
      }
    } catch (err: any) {
      console.error('Erro de upload ao Supabase:', err);
      setError(`Erro no upload de "${file.name}": ${err.message || err}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Report Modal states
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportType, setReportType] = useState<'alphabetical' | 'birthday'>('alphabetical');
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [birthdaySortMode, setBirthdaySortMode] = useState<'alphabetical' | 'birthday'>('birthday');
  const [generatingReport, setGeneratingReport] = useState(false);

  async function fetchUfs() {
    try {
      const { data, error } = await supabase
        .from('ufs')
        .select('*')
        .order('nome', { ascending: true });
      if (!error && data) {
        setUfs(data);
      }
    } catch (e) {
      console.error('Error loading UFs:', e);
    }
  }

  useEffect(() => {
    fetchUfs();
  }, []);

  async function fetchGrupos() {
    if (!selectedIgreja) return;
    try {
      const { data, error } = await supabase
        .from('comunidades')
        .select('id, nome')
        .eq('id_igreja', selectedIgreja.id)
        .order('nome', { ascending: true });
      if (!error && data) {
        setGrupos(data);
      }
    } catch (e) {
      console.error('Error loading groups:', e);
    }
  }

  useEffect(() => {
    if (selectedIgreja) {
      fetchMembros();
      fetchGrupos();
    } else {
      setMembros([]);
      setGrupos([]);
      setLoading(false);
    }
  }, [selectedIgreja]);

  async function fetchMembros() {
    if (!selectedIgreja) return;
    try {
      setLoading(true);
      setError('');
      const { data, error: err } = await supabase
        .from('membros')
        .select('*')
        .eq('id_igreja', selectedIgreja.id)
        .order('nome', { ascending: true });

      if (err) throw err;
      if (data) {
        setMembros(data);
      }
    } catch (e: any) {
      setError('Erro ao buscar membros: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (membro: Membro) => {
    setCurrentMembro(membro);
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleNew = () => {
    if (!selectedIgreja) {
      setError('Selecione uma igreja antes de cadastrar membros.');
      return;
    }
    setCurrentMembro({
      id_igreja: selectedIgreja.id,
      nome: '',
      email: '',
      telefone: '',
      data_nascimento: '',
      status: 'Ativo',
      batizado_aguas: false,
      batizado_espirito: false,
      cargo: 'Membro',
      foto_url: '',
      cpf: '',
      sexo: 'Masculino',
      estado_civil: 'Solteiro(a)',
      escolaridade: 'Ensino Médio Completo',
      endereco: '',
      bairro: '',
      cidade: '',
      id_uf: '',
      cep: '',
      pais: 'Brasil',
      recepcao: 'Batismo',
      categoria: 'Adulto',
      data_batismo: '',
      data_conversao: '',
      id_conjuge: '',
      id_grupo: '',
      id_comunidade: '',
    });
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = (id: string, nome: string) => {
    confirmDelete({
      message: `Deseja realmente excluir o membro "${nome}"? Esta ação não poderá ser desfeita.`,
      onConfirm: async () => {
        try {
          const { error: err } = await supabase.from('membros').delete().eq('id', id);
          if (err) throw err;
          setSuccess('Membro excluído com sucesso!');
          fetchMembros();
        } catch (e: any) {
          setError('Erro ao excluir membro: ' + (e.message || e));
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedIgreja) {
      setError('Selecione uma igreja válida.');
      return;
    }

    if (!currentMembro.nome) {
      setError('O nome do membro é obrigatório.');
      return;
    }

    if (currentMembro.cpf && currentMembro.cpf.trim() !== '') {
      if (!validateCPF(currentMembro.cpf)) {
        setError('O CPF informado é inválido. Por favor, verifique os dígitos.');
        return;
      }
    }

    const payload: any = {
      id_igreja: selectedIgreja.id,
      nome: currentMembro.nome,
      email: currentMembro.email || null,
      telefone: currentMembro.telefone || null,
      data_nascimento: currentMembro.data_nascimento || null,
      status: currentMembro.status || 'Ativo',
      batizado_aguas: !!currentMembro.batizado_aguas,
      batizado_espirito: !!currentMembro.batizado_espirito,
      cargo: currentMembro.cargo || 'Membro',
      foto_url: currentMembro.foto_url || null,
      cpf: currentMembro.cpf || null,
      sexo: currentMembro.sexo || null,
      estado_civil: currentMembro.estado_civil || null,
      escolaridade: currentMembro.escolaridade || null,
      endereco: currentMembro.endereco || null,
      bairro: currentMembro.bairro || null,
      cidade: currentMembro.cidade || null,
      id_uf: currentMembro.id_uf || null,
      cep: currentMembro.cep || null,
      pais: currentMembro.pais || null,
      recepcao: currentMembro.recepcao || null,
      categoria: currentMembro.categoria || 'Adulto',
      data_batismo: currentMembro.data_batismo || null,
      data_conversao: currentMembro.data_conversao || null,
      id_conjuge: currentMembro.id_conjuge || null,
      id_grupo: currentMembro.id_grupo || null,
      id_comunidade: currentMembro.id_grupo || null,
    };

    try {
      if (currentMembro.id) {
        payload.atualizado_por_nome = user?.nome || user?.email || 'Membro';
        payload.atualizado_em = new Date().toISOString();
        const { error: err } = await supabase
          .from('membros')
          .update(payload)
          .eq('id', currentMembro.id);
        if (err) throw err;
        setSuccess('Membro atualizado com sucesso!');
      } else {
        payload.criado_por_nome = user?.nome || user?.email || 'Membro';
        const { error: err } = await supabase.from('membros').insert(payload);
        if (err) throw err;
        setSuccess('Membro cadastrado com sucesso!');
      }
      setIsEditing(false);
      fetchMembros();
    } catch (e: any) {
      setError('Erro ao salvar membro: ' + (e.message || e));
    }
  };

  const formatNascimento = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  const getProxyUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  };

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      if (!url) {
        reject();
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject();
      img.src = getProxyUrl(url);
    });
  };

  const getRoundedCircleBase64 = (img: HTMLImageElement): string => {
    try {
      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height) || 128;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
        ctx.clip();
        ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, size, size);
        return canvas.toDataURL('image/png', 0.82);
      }
    } catch (e) {
      console.error('Error rounding circle image', e);
    }
    return '';
  };

  const getRoundedRectBase64 = (img: HTMLImageElement, radiusPct = 0.15): string => {
    try {
      const canvas = document.createElement('canvas');
      const w = img.width || 128;
      const h = img.height || 128;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        const r = Math.min(w, h) * radiusPct;
        ctx.moveTo(r, 0);
        ctx.lineTo(w - r, 0);
        ctx.quadraticCurveTo(w, 0, w, r);
        ctx.lineTo(w, h - r);
        ctx.quadraticCurveTo(w, h, w - r, h);
        ctx.lineTo(r, h);
        ctx.quadraticCurveTo(0, h, 0, h - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0, w, h);
        return canvas.toDataURL('image/png', 0.85);
      }
    } catch (e) {
      console.error('Error rounding rect image', e);
    }
    return '';
  };

  const drawInitials = (doc: jsPDF, name: string, x: number, y: number, size: number) => {
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    doc.setFillColor(0, 0, 0); // Black circle
    doc.circle(x + size/2, y + size/2, size/2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(initial, x + size/2, y + size/2 + 2.5, { align: 'center' });
  };

  const generateReport = async () => {
    try {
      setGeneratingReport(true);
      setError('');
      setSuccess('');

      // 1. Identify members to export
      let membersToExport: Membro[] = [];

      if (reportType === 'alphabetical') {
        membersToExport = [...membros].sort((a, b) => a.nome.localeCompare(b.nome));
      } else {
        // Birthday filter
        membersToExport = m_filterBirthdays();
      }

      if (membersToExport.length === 0) {
        setError('Nenhum membro encontrado com os filtros selecionados.');
        setGeneratingReport(false);
        return;
      }

      // 2. Preload church logo and member photos/placeholders
      let preloadedLogoImg: HTMLImageElement | null = null;
      if (selectedIgreja?.logo_url) {
        try {
          preloadedLogoImg = await loadImage(selectedIgreja.logo_url);
        } catch (e) {
          console.warn("Could not load church logo image: " + selectedIgreja.logo_url);
        }
      }
      // Fallback church logo placeholder
      if (!preloadedLogoImg) {
        try {
          preloadedLogoImg = await loadImage('https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=100&h=100&fit=crop');
        } catch (e) {
          console.warn("Could not load default church logo");
        }
      }

      let logoBase64 = '';
      if (preloadedLogoImg) {
        logoBase64 = getRoundedRectBase64(preloadedLogoImg, 0.2); // rounded corner logo matching standard rounded-xl sidebar pattern
      }

      const preloadedImagesMap: Record<string, string> = {};
      const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
      
      const imageLoadPromises = membersToExport.map(async (m) => {
        const urlToLoad = m.foto_url || defaultAvatar;
        try {
          const img = await loadImage(urlToLoad);
          const circleB64 = getRoundedCircleBase64(img);
          if (circleB64) {
            preloadedImagesMap[m.id] = circleB64;
          }
        } catch (e) {
          try {
            const fallbackImg = await loadImage(defaultAvatar);
            const circleB64 = getRoundedCircleBase64(fallbackImg);
            if (circleB64) {
              preloadedImagesMap[m.id] = circleB64;
            }
          } catch (err) {
            // failed gracefully, let fallback draw initials
          }
        }
      });
      await Promise.all(imageLoadPromises);

      // 3. Create PDF Instance
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // 4. Elegantly style PDF Brand Header Card (all lines in black)
      const churchName = selectedIgreja?.nome || 'Minha Igreja';
      const docTitle = reportType === 'alphabetical'
        ? 'RELATÓRIO GERAL DE MEMBROS (ORDEM ALFABÉTICA)'
        : `RELATÓRIO DE ANIVERSARIANTES - MÊS ${reportMonth.toString().padStart(2, '0')}`;
      
      const generationDate = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Header block card (white fill, black stroke)
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(0, 0, 0); // Black lines (as linhas do cabeçalho)
      doc.setLineWidth(0.4);
      doc.rect(10, 10, 190, 24, 'FD');

      // Draw the church logo at the beginning of the header CARD (matching sidebar proportion)
      const logoSize = 12; // 12mm size
      let textStartX = 15;
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 14, 16, logoSize, logoSize);
          textStartX = 14 + logoSize + 4; // 30
        } catch (err) {
          console.error("Error drawing logo", err);
        }
      }

      // Title & metrics texts (all in black theme color)
      doc.setTextColor(0, 0, 0); // Black
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(churchName.toUpperCase(), textStartX, 17);

      doc.setTextColor(0, 0, 0); // Black
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(docTitle, textStartX, 23);

      doc.setTextColor(80, 80, 80); // Dark Gray
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Gerado em: ${generationDate}  |  Total de Registros: ${membersToExport.length}`, textStartX, 29);

      // 5. Map rows
      let tableHeaders: string[] = [];
      let tableRows: any[][] = [];

      if (reportType === 'alphabetical') {
        tableHeaders = ['Foto', 'Nome do Membro', 'Cargo / Função', 'Telefone', 'Data Nascimento'];
        tableRows = membersToExport.map(m => [
          '', // Placeholder drawn in didDrawCell
          m.nome,
          m.cargo || 'Membro',
          m.telefone || '-',
          formatNascimento(m.data_nascimento),
          m.id
        ]);
      } else {
        tableHeaders = ['Foto', 'Data Nasc.', 'Nome do Membro', 'Cargo / Função', 'Telefone'];
        tableRows = membersToExport.map(m => [
          '', // Placeholder
          formatNascimento(m.data_nascimento),
          m.nome,
          m.cargo || 'Membro',
          m.telefone || '-',
          m.id
        ]);
      }

      // 6. Draw with AutoTable
      autoTable(doc, {
        startY: 38,
        head: [tableHeaders],
        body: tableRows,
        theme: 'striped',
        headStyles: {
          fillColor: [0, 0, 0], // Pure Black background for head!
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          valign: 'middle',
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
        },
        bodyStyles: {
          fontSize: 8.5,
          valign: 'middle',
          textColor: [0, 0, 0], // black text
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { cellWidth: 16, halign: 'center' },
        },
        styles: {
          font: 'helvetica',
          cellPadding: 4,
          overflow: 'linebreak',
          lineColor: [0, 0, 0], // black table borders
          lineWidth: 0.1,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didDrawCell: (data) => {
          if (data.column.index === 0 && data.cell.section === 'body') {
            const rawRow = data.row.raw as any[];
            const memberId = rawRow[rawRow.length - 1];
            const memberName = reportType === 'alphabetical' ? rawRow[1] : rawRow[2];
            
            const cellWidth = data.cell.width;
            const cellHeight = data.cell.height;
            const size = 10;
            const x = data.cell.x + (cellWidth - size) / 2;
            const y = data.cell.y + (cellHeight - size) / 2;

            const preloadedImgB64 = preloadedImagesMap[memberId];
            if (preloadedImgB64) {
              try {
                doc.addImage(preloadedImgB64, 'PNG', x, y, size, size);
              } catch (err) {
                drawInitials(doc, memberName, x, y, size);
              }
            } else {
              drawInitials(doc, memberName, x, y, size);
            }
          }
        }
      });

      // 7. Save file download
      const reportName = reportType === 'alphabetical' ? 'membros_alfabetica' : 'aniversariantes';
      doc.save(`relatorio_${reportName}_${new Date().toISOString().substring(0,10)}.pdf`);
      setSuccess('Relatório compilado e baixado com sucesso!');
      setIsReportOpen(false);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao compilar documento de relatório PDF: ' + (err.message || err));
    } finally {
      setGeneratingReport(false);
    }
  };

  const m_filterBirthdays = () => {
    const list = membros.filter(m => {
      if (!m.data_nascimento) return false;
      const parts = m.data_nascimento.split('-');
      if (parts.length !== 3) return false;
      
      const monthMatches = parseInt(parts[1], 10) === reportMonth;
      return monthMatches;
    });

    if (birthdaySortMode === 'alphabetical') {
      return [...list].sort((a, b) => a.nome.localeCompare(b.nome));
    } else {
      // Chronological order by birth day
      return [...list].sort((a, b) => {
        const dayA = parseInt(a.data_nascimento!.split('-')[2], 10);
        const dayB = parseInt(b.data_nascimento!.split('-')[2], 10);
        return dayA - dayB;
      });
    }
  };

  const filteredMembros = membros.filter(m => {
    // a) Descrição: Pesquisa em todos os campos
    const searchLower = search.toLowerCase();
    const ufInfoObj = ufs.find(u => u.id === m.id_uf);
    const ufNome = ufInfoObj ? ufInfoObj.nome : '';
    const ufSigla = ufInfoObj ? ufInfoObj.sigla : '';

    const matchesSearch = 
      m.nome.toLowerCase().includes(searchLower) || 
      (m.email && m.email.toLowerCase().includes(searchLower)) ||
      (m.cargo && m.cargo.toLowerCase().includes(searchLower)) ||
      (m.cpf && m.cpf.toLowerCase().includes(searchLower)) ||
      (m.telefone && m.telefone.toLowerCase().includes(searchLower)) ||
      (m.endereco && m.endereco.toLowerCase().includes(searchLower)) ||
      (m.bairro && m.bairro.toLowerCase().includes(searchLower)) ||
      (m.cidade && m.cidade.toLowerCase().includes(searchLower)) ||
      (ufNome && ufNome.toLowerCase().includes(searchLower)) ||
      (ufSigla && ufSigla.toLowerCase().includes(searchLower)) ||
      (m.recepcao && m.recepcao.toLowerCase().includes(searchLower));

    // Filter status
    const matchesStatus = statusFilter === 'todos' || m.status === statusFilter;

    // Filter Sexo
    const matchesSexo = sexoFilter === 'todos' || m.sexo === sexoFilter;

    // Filter Estado Civil
    const matchesEstadoCivil = estadoCivilFilter === 'todos' || m.estado_civil === estadoCivilFilter;

    // Filter Mês de Nascimento
    let matchesMesNascimento = true;
    if (mesNascimentoFilter !== 'todos') {
      if (m.data_nascimento) {
        const parts = m.data_nascimento.split('-');
        if (parts.length >= 2) {
          const month = parseInt(parts[1], 10);
          matchesMesNascimento = month === parseInt(mesNascimentoFilter, 10);
        } else {
          matchesMesNascimento = false;
        }
      } else {
        matchesMesNascimento = false;
      }
    }

    return matchesSearch && matchesStatus && matchesSexo && matchesEstadoCivil && matchesMesNascimento;
  });

  const totalItems = filteredMembros.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const clampedCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const startIndex = (clampedCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedMembros = filteredMembros.slice(startIndex, endIndex);

  const canRead = hasPermission('membros:leitura');

  if (!canRead) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[450px]" id="membros-no-access">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 text-center max-w-md w-full space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Acesso Restrito</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
            Seu perfil de usuário não possui permissão de leitura para o módulo de <strong>Gestão de Membros</strong>. Entre em contato com o administrador do sistema se precisar de acesso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-1">Membros</p>
          <h2 className="text-3xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">Membros</h2>
          <p className="text-slate-500 text-sm">
            Gestão de membros para {selectedIgreja ? selectedIgreja.nome : 'esta igreja'}
          </p>
        </div>
        {!isEditing && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setIsReportOpen(true);
                setError('');
                setSuccess('');
              }}
              disabled={!selectedIgreja || membros.length === 0}
              className="flex items-center gap-2 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-800 dark:text-slate-100 font-bold py-3 px-6 rounded-xl border border-slate-250 dark:border-slate-700 shadow-sm transition active:scale-95 text-sm uppercase tracking-wider cursor-pointer disabled:opacity-50"
            >
              <FileText size={18} className="text-amber-600" />
              Relatórios
            </button>
            {hasPermission('membros:novo') && (
              <button
                onClick={handleNew}
                disabled={!selectedIgreja}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-md transition active:scale-95 text-sm uppercase tracking-wider cursor-pointer"
              >
                <Plus size={18} />
                Novo Membro
              </button>
            )}
          </div>
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
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-700 pb-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {currentMembro.id ? 'Editar Cadastro de Membro' : 'Novo Membro'}
            </h3>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Secção I: Identificação */}
            <div className="md:col-span-2 border-b border-slate-100 dark:border-slate-700/80 pb-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#E4A232]">I. Identificação Básica</h4>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={currentMembro.nome || ''}
                onChange={(e) => setCurrentMembro({ ...currentMembro, nome: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                placeholder="Ex. Nome do Membro"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                CPF (Opcional)
              </label>
              <input
                type="text"
                value={currentMembro.cpf || ''}
                onChange={(e) => setCurrentMembro({ ...currentMembro, cpf: formatCPF(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Sexo *
              </label>
              <select
                value={currentMembro.sexo || 'Masculino'}
                onChange={(e) => setCurrentMembro({ ...currentMembro, sexo: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
              >
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Estado Civil *
              </label>
              <select
                value={currentMembro.estado_civil || 'Solteiro(a)'}
                onChange={(e) => setCurrentMembro({ ...currentMembro, estado_civil: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
              >
                <option value="Solteiro(a)">Solteiro(a)</option>
                <option value="Casado(a)">Casado(a)</option>
                <option value="Divorciado(a)">Divorciado(a)</option>
                <option value="Viúvo(a)">Viúvo(a)</option>
                <option value="Separado(a)">Separado(a)</option>
                <option value="União Estável">União Estável</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Escolaridade *
              </label>
              <select
                value={currentMembro.escolaridade || 'Ensino Médio Completo'}
                onChange={(e) => setCurrentMembro({ ...currentMembro, escolaridade: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
              >
                <option value="Analfabeto">Analfabeto</option>
                <option value="Ensino Fundamental Incompleto">Ensino Fundamental Incompleto</option>
                <option value="Ensino Fundamental Completo">Ensino Fundamental Completo</option>
                <option value="Ensino Médio Incompleto">Ensino Médio Incompleto</option>
                <option value="Ensino Médio Completo">Ensino Médio Completo</option>
                <option value="Ensino Técnico">Ensino Técnico</option>
                <option value="Ensino Superior Incompleto">Ensino Superior Incompleto</option>
                <option value="Ensino Superior Completo">Ensino Superior Completo</option>
                <option value="Pós-Graduação">Pós-Graduação (Especialização / Mestrado / Doutorado)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Data de Nascimento
              </label>
              <input
                type="date"
                value={currentMembro.data_nascimento || ''}
                onChange={(e) => setCurrentMembro({ ...currentMembro, data_nascimento: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Idade (Cálculo Automático)
              </label>
              <input
                type="text"
                disabled
                value={calculateAge(currentMembro.data_nascimento)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Foto de Perfil (URL ou Upload)
              </label>
              <div className="space-y-3">
                <input
                  type="text"
                  value={currentMembro.foto_url || ''}
                  onChange={(e) => setCurrentMembro({ ...currentMembro, foto_url: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold text-xs"
                  placeholder="Link da imagem para foto"
                />

                {/* If foto_url is empty, show the Drag & Drop area */}
                {!(currentMembro.foto_url && currentMembro.foto_url.trim() !== '') && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!isUploading) setIsDragging(true);
                    }}
                    onDragLeave={() => {
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (isUploading) return;
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleFileSelection(Array.from(e.dataTransfer.files));
                      }
                    }}
                    onClick={() => {
                      if (!isUploading) {
                        document.getElementById('membro-photo-upload-input')?.click();
                      }
                    }}
                    className={`p-4 rounded-xl border-2 border-dashed transition-all duration-200 text-center flex flex-col items-center justify-center gap-2 ${
                      isDragging
                        ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-955/20 cursor-pointer'
                        : isUploading
                          ? 'border-amber-500/50 bg-amber-50/5 dark:bg-amber-955/5 cursor-wait opacity-80'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:border-amber-500/55 cursor-pointer'
                    }`}
                  >
                    <input
                      type="file"
                      id="membro-photo-upload-input"
                      className="hidden"
                      accept="image/*"
                      disabled={isUploading}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileSelection(Array.from(e.target.files));
                        }
                      }}
                    />
                    
                    {isUploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[11px] font-bold text-amber-500 animate-pulse">Enviando foto...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={20} className="text-amber-500" />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Arraste e solte a foto aqui, ou <span className="text-amber-600 dark:text-amber-400 font-bold underline">clique para selecionar</span>.
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* If foto_url has value, show a tiny preview with a clear option */}
                {currentMembro.foto_url && currentMembro.foto_url.trim() !== '' && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentMembro.foto_url}
                      alt="Prévia"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Foto Selecionada</p>
                      <p className="text-xs text-slate-600 dark:text-slate-350 truncate">{currentMembro.foto_url}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentMembro(prev => ({ ...prev, foto_url: '' }))}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-955/20 rounded transition-colors"
                      title="Remover foto"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Faixa Etária *
              </label>
              <select
                value={currentMembro.categoria || 'Adulto'}
                onChange={(e) => setCurrentMembro({ ...currentMembro, categoria: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
              >
                <option value="Adulto">Adulto</option>
                <option value="Idoso">Idoso</option>
                <option value="Jovens">Jovens</option>
                <option value="Adolescentes">Adolescentes</option>
                <option value="Crianças">Crianças</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Cônjuge
              </label>
              <select
                value={currentMembro.id_conjuge || ''}
                onChange={(e) => setCurrentMembro({ ...currentMembro, id_conjuge: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
              >
                <option value="">Sem Cônjuge / Não informado</option>
                {membros
                  .filter((m) => m.id !== currentMembro.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Grupo / Comunidade
              </label>
              <select
                value={currentMembro.id_grupo || ''}
                onChange={(e) => setCurrentMembro({ ...currentMembro, id_grupo: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
              >
                <option value="">Nenhum Grupo</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Secção II: Contato e Endereço */}
            <div className="md:col-span-2 border-b border-slate-100 dark:border-slate-700/80 pt-4 pb-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#E4A232]">II. Contato e Endereço</h4>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                E-mail (Opcional)
              </label>
              <input
                type="email"
                value={currentMembro.email || ''}
                onChange={(e) => setCurrentMembro({ ...currentMembro, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                placeholder="exemplo@luz.com"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Telefone (Opcional)
              </label>
              <input
                type="text"
                value={currentMembro.telefone || ''}
                onChange={(e) => setCurrentMembro({ ...currentMembro, telefone: formatTelefone(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                placeholder="(00) 90000-0000"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                CEP (Opcional)
              </label>
              <input
                type="text"
                value={currentMembro.cep || ''}
                onChange={(e) => setCurrentMembro({ ...currentMembro, cep: formatCEP(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                placeholder="00000-000"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Endereço Residencial (Opcional)
              </label>
              <input
                type="text"
                value={currentMembro.endereco || ''}
                onChange={(e) => setCurrentMembro({ ...currentMembro, endereco: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                placeholder="Rua, Número, Complemento"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Bairro
              </label>
              <input
                type="text"
                value={currentMembro.bairro || ''}
                onChange={(e) => setCurrentMembro({ ...currentMembro, bairro: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                placeholder="Ex. Bairro"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Cidade
              </label>
              <input
                type="text"
                value={currentMembro.cidade || ''}
                onChange={(e) => setCurrentMembro({ ...currentMembro, cidade: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                placeholder="Ex. Cidade"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Estado (UF) *
              </label>
              <select
                value={currentMembro.id_uf || ''}
                onChange={(e) => {
                  const selectedId_uf = e.target.value;
                  setCurrentMembro({
                    ...currentMembro,
                    id_uf: selectedId_uf
                  });
                }}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
              >
                <option value="">Selecione o Estado</option>
                {ufs.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} ({u.sigla})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                País
              </label>
              <input
                type="text"
                value={currentMembro.pais || 'Brasil'}
                onChange={(e) => setCurrentMembro({ ...currentMembro, pais: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                placeholder="Ex. Brasil"
              />
            </div>

            {/* Secção III: Recepção e Eclesiástico */}
            <div className="md:col-span-2 border-b border-slate-100 dark:border-slate-700/80 pt-4 pb-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#E4A232]">III. Recepção e Batismo</h4>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Cargo / Função
              </label>
              <select
                value={currentMembro.cargo || 'Membro'}
                onChange={(e) => setCurrentMembro({ ...currentMembro, cargo: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
              >
                <option value="Membro">Membro</option>
                <option value="Pastor">Pastor(a)</option>
                <option value="Co-Pastor">Co-Pastor(a)</option>
                <option value="Evangelista">Evangelista</option>
                <option value="Presbítero">Presbítero</option>
                <option value="Diácono">Diácono(isa)</option>
                <option value="Missionário">Missionário(a)</option>
                <option value="Cooperador">Cooperador(a)</option>
                <option value="Líder de Grupo">Líder de Grupo</option>
                <option value="Obreiro">Obreiro(a)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Status de Membresia
              </label>
              <select
                value={currentMembro.status || 'Ativo'}
                onChange={(e) => setCurrentMembro({ ...currentMembro, status: e.target.value as any })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
                <option value="Visitante">Visitante</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Data de Batismo (Opcional)
              </label>
              <input
                type="date"
                value={currentMembro.data_batismo || ''}
                onChange={(e) => setCurrentMembro({ ...currentMembro, data_batismo: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Data de Conversão (Opcional)
              </label>
              <input
                type="date"
                value={currentMembro.data_conversao || ''}
                onChange={(e) => setCurrentMembro({ ...currentMembro, data_conversao: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
              />
            </div>

            {/* Quadro Recepção com as 3 opções da igreja */}
            <div className="p-4 border-2 border-slate-100 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
              <label className="block text-[10px] font-black text-[#E4A232] uppercase tracking-widest ml-1 font-bold">
                Quadro para Recepção
              </label>
              <div className="flex flex-col gap-2">
                {[
                  { key: 'Jurisdição', value: '1) Jurisdição' },
                  { key: 'Batismo', value: '2) Batismo' },
                  { key: 'Transferência', value: '3) Transferência' }
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="recepcao"
                      value={item.key}
                      checked={(currentMembro.recepcao || 'Batismo') === item.key}
                      onChange={() => setCurrentMembro({ ...currentMembro, recepcao: item.key })}
                      className="w-4 h-4 text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <span>{item.value}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Audit Log for members */}
            {currentMembro.id && (
              <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-700/80 pt-6 mt-4 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#E4A232]">📝 Histórico de Auditoria</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {/* Created log */}
                  <div className="flex gap-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    <div>
                      <span className="font-extrabold text-slate-700 dark:text-slate-300 uppercase text-[9px] block">Criado por</span>
                      <p className="leading-relaxed">
                        <span className="text-slate-900 dark:text-white font-black">{currentMembro.criado_por_nome || 'Sistema (Legado)'}</span> em{' '}
                        <span>{currentMembro.criado_em ? new Date(currentMembro.criado_em).toLocaleString('pt-BR') : 'Data inicial do sistema'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Updated log */}
                  <div className="flex gap-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 font-bold">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                    <div>
                      <span className="font-extrabold text-slate-700 dark:text-slate-300 uppercase text-[9px] block">Última atualização por</span>
                      <p className="leading-relaxed">
                        <span className="text-slate-900 dark:text-white font-black">{currentMembro.atualizado_por_nome || 'Nenhuma atualização'}</span>
                        {currentMembro.atualizado_em && (
                          <>
                            {' '}em{' '}
                            <span>{new Date(currentMembro.atualizado_em).toLocaleString('pt-BR')}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all uppercase text-xs tracking-wider"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:opacity-90 uppercase text-xs tracking-widest"
            >
              <Save size={16} />
              Salvar Membro
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Filters shelf */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              {/* Pesquisa Descrição (all fields) */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  🔍 Descrição (Busca em todos os campos)
                </label>
                <div className="relative w-full">
                  <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Busca por CPF, nome, contato, bairro, cidade, recepção..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-amber-500 transition-all font-medium text-xs text-ellipsis cursor-pointer"
                  />
                </div>
              </div>

              {/* Sexo Filter */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  👫 Filtrar por Sexo
                </label>
                <select
                  value={sexoFilter}
                  onChange={(e) => setSexoFilter(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 outline-none focus:border-amber-500 transition-all font-bold text-xs"
                >
                  <option value="todos">Todos os Sexos</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                </select>
              </div>

              {/* Estado Civil Filter */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  💍 Estado Civil
                </label>
                <select
                  value={estadoCivilFilter}
                  onChange={(e) => setEstadoCivilFilter(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-755 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 outline-none focus:border-amber-500 transition-all font-bold text-xs"
                >
                  <option value="todos">Todos Estados Civis</option>
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viúvo(a)">Viúvo(a)</option>
                  <option value="Separado(a)">Separado(a)</option>
                  <option value="União Estável">União Estável</option>
                </select>
              </div>

              {/* Mês de Nascimento Filter */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  📅 Mês de Nascimento
                </label>
                <select
                  value={mesNascimentoFilter}
                  onChange={(e) => setMesNascimentoFilter(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-755 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 outline-none focus:border-amber-500 transition-all font-bold text-xs"
                >
                  <option value="todos">Todos os Meses</option>
                  <option value="1">Janeiro</option>
                  <option value="2">Fevereiro</option>
                  <option value="3">Março</option>
                  <option value="4">Abril</option>
                  <option value="5">Maio</option>
                  <option value="6">Junho</option>
                  <option value="7">Julho</option>
                  <option value="8">Agosto</option>
                  <option value="9">Setembro</option>
                  <option value="10">Outubro</option>
                  <option value="11">Novembro</option>
                  <option value="12">Dezembro</option>
                </select>
              </div>
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 ml-1">Status de Membro:</span>
              {['todos', 'Ativo', 'Inativo', 'Visitante'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                    statusFilter === status
                      ? 'bg-amber-150 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300'
                      : 'bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-450 border border-slate-200 dark:border-slate-850 hover:bg-slate-50'
                  }`}
                >
                  {status === 'todos' ? 'Todos' : status}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin" />
                Carregando membros...
              </div>
            ) : filteredMembros.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                Nenhum membro encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      <th className="px-6 py-4">Membro</th>
                      <th className="px-6 py-4">Contato</th>
                      <th className="px-6 py-4">Cargo / Função</th>
                      <th className="px-6 py-4">Faixa Etária</th>
                      <th className="px-6 py-4">Quadro de Recepção</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium text-slate-700 dark:text-slate-300">
                    {paginatedMembros.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                              {m.foto_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={m.foto_url} alt={m.nome} className="w-10 h-10 object-cover" />
                              ) : (
                                <UserCheck size={20} className="text-slate-400 animate-pulse" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {m.nome}
                                <span className={`text-[8px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded ${
                                  m.status === 'Ativo'
                                    ? 'bg-green-150 text-green-800 dark:bg-green-950/40 dark:text-green-400'
                                    : m.status === 'Visitante'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                                    : 'bg-red-150 text-red-800 dark:bg-red-950/40 dark:text-red-400'
                                }`}>
                                  {m.status}
                                </span>
                              </div>
                              {m.data_nascimento && (
                                <div className="text-xs text-slate-400 font-normal">
                                  Nasc: {new Date(m.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')} ( {calculateAge(m.data_nascimento)} )
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold">{m.email || '-'}</div>
                          <div className="text-xs text-slate-400 font-normal">{m.telefone || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-300 text-xs px-2.5 py-1 rounded-full font-bold">
                            {m.cargo || 'Membro'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 text-xs px-2.5 py-1 rounded-full font-bold">
                            {m.categoria || 'Adulto'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
                            m.recepcao === 'Jurisdição'
                              ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40'
                              : m.recepcao === 'Transferência'
                              ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/40'
                              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40'
                          }`}>
                            {m.recepcao || 'Batismo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {hasPermission('membros:editar') && (
                              <button
                                onClick={() => handleEdit(m)}
                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-50 dark:hover:bg-slate-900 transition rounded-lg"
                                title="Editar"
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                            {hasPermission('membros:excluir') && (
                              <button
                                onClick={() => handleDelete(m.id, m.nome)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-50 dark:hover:bg-slate-900 transition rounded-lg"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredMembros.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 border-t border-slate-100 dark:border-slate-800 rounded-b-3xl">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-bold">
                  <span>Registros por página:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded px-2.5 py-1 outline-none text-slate-900 dark:text-white font-bold cursor-pointer"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="ml-4">
                    Mostrando {totalItems === 0 ? 0 : startIndex + 1}-{endIndex} de {totalItems} membros
                  </span>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={clampedCurrentPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Anterior
                    </button>
                    
                    {Array.from({ length: totalPages }).map((_, index) => {
                      const page = index + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                            clampedCurrentPage === page
                              ? 'bg-amber-600 text-white'
                              : 'border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={clampedCurrentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Próximo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isReportOpen && (
        <div id="reports-modal" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-850 shadow-2xl w-full max-w-lg p-8 space-y-6 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-amber-600 font-bold">
                <Printer size={22} className="animate-bounce" />
                <h3 className="text-xl font-black font-headline uppercase tracking-tight text-slate-900 dark:text-white">Impressão de Relatórios</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsReportOpen(false)} 
                className="text-slate-450 hover:text-slate-650 dark:hover:text-slate-200 p-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Selecione o Tipo de Relatório
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <label className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition ${
                    reportType === 'alphabetical'
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-850/50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="report_type"
                        value="alphabetical"
                        checked={reportType === 'alphabetical'}
                        onChange={() => setReportType('alphabetical')}
                        className="w-4 h-4 text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-850 dark:text-white">a) Relatório em Ordem Alfabética</p>
                        <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">Nome completo, cargo/função, telefone, data nascimento</p>
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition ${
                    reportType === 'birthday'
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-850/50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="report_type"
                        value="birthday"
                        checked={reportType === 'birthday'}
                        onChange={() => setReportType('birthday')}
                        className="w-4 h-4 text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-850 dark:text-white">b) Relatório de Aniversariantes do Mês</p>
                        <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">Foto, data nascimento, nome, cargo, telefone</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Birthday filters (Show only when reportType === 'birthday') */}
              {reportType === 'birthday' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-4 duration-300">
                  <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Calendar size={12} className="text-amber-500" />
                    Parâmetros do Aniversariante
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                        Mês Festivo *
                      </label>
                      <select
                        value={reportMonth}
                        onChange={(e) => setReportMonth(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold text-sm"
                      >
                        <option value={1}>Janeiro</option>
                        <option value={2}>Fevereiro</option>
                        <option value={3}>Março</option>
                        <option value={4}>Abril</option>
                        <option value={5}>Maio</option>
                        <option value={6}>Junho</option>
                        <option value={7}>Julho</option>
                        <option value={8}>Agosto</option>
                        <option value={9}>Setembro</option>
                        <option value={10}>Outubro</option>
                        <option value={11}>Novembro</option>
                        <option value={12}>Dezembro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                        Ordenação do Relatório *
                      </label>
                      <div className="flex flex-col gap-2.5 mt-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="birthday_sort_mode"
                            value="birthday"
                            checked={birthdaySortMode === 'birthday'}
                            onChange={() => setBirthdaySortMode('birthday')}
                            className="w-4 h-4 text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
                          />
                          <span>Ordem de Aniversário</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="birthday_sort_mode"
                            value="alphabetical"
                            checked={birthdaySortMode === 'alphabetical'}
                            onChange={() => setBirthdaySortMode('alphabetical')}
                            className="w-4 h-4 text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
                          />
                          <span>Ordem Alfabética</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsReportOpen(false)}
                className="px-5 py-3 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase text-xs tracking-wider cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={generateReport}
                disabled={generatingReport}
                className="flex items-center gap-2 bg-[#E4A232] hover:bg-[#c98e2a] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md uppercase text-xs tracking-widest disabled:opacity-50 cursor-pointer"
              >
                {generatingReport ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <Printer size={14} />
                    Gerar Relatório
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
