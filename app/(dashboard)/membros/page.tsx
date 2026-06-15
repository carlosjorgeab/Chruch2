'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useIgreja } from '@/context/IgrejaContext';
import { useAuth } from '@/context/AuthContext';
import { Plus, Edit2, Trash2, Save, X, Search, Check, RefreshCw, UserCheck, FileText, Calendar, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
};

export default function MembrosPage() {
  const { selectedIgreja } = useIgreja();
  const { user } = useAuth();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

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
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Report Modal states
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportType, setReportType] = useState<'alphabetical' | 'birthday'>('alphabetical');
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [reportYear, setReportYear] = useState<string>('todos'); // 'todos' or string year like '1990'
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    if (selectedIgreja) {
      fetchMembros();
    } else {
      setMembros([]);
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
    });
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente excluir o membro "${nome}"?`)) {
      return;
    }
    try {
      const { error: err } = await supabase.from('membros').delete().eq('id', id);
      if (err) throw err;
      setSuccess('Membro excluído com sucesso!');
      fetchMembros();
    } catch (e: any) {
      setError('Erro ao excluir membro: ' + (e.message || e));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedIgreja) {
      setError('Selecione uma congregação válida.');
      return;
    }

    if (!currentMembro.nome) {
      setError('O nome do membro é obrigatório.');
      return;
    }

    const payload = {
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
    };

    try {
      if (currentMembro.id) {
        const { error: err } = await supabase
          .from('membros')
          .update(payload)
          .eq('id', currentMembro.id);
        if (err) throw err;
        setSuccess('Membro atualizado com sucesso!');
      } else {
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
      const churchName = selectedIgreja?.nome || 'Minha Congregação';
      const docTitle = reportType === 'alphabetical'
        ? 'RELATÓRIO GERAL DE MEMBROS (ORDEM ALFABÉTICA)'
        : `RELATÓRIO DE ANIVERSARIANTES - MÊS ${reportMonth.toString().padStart(2, '0')}${reportYear !== 'todos' ? ` / ANO ${reportYear}` : ''}`;
      
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
      const yearMatches = reportYear === 'todos' || parts[0] === reportYear;
      return monthMatches && yearMatches;
    });

    // Chronological order by birth day
    return list.sort((a, b) => {
      const dayA = parseInt(a.data_nascimento!.split('-')[2], 10);
      const dayB = parseInt(b.data_nascimento!.split('-')[2], 10);
      return dayA - dayB;
    });
  };

  const filteredMembros = membros.filter(m => {
    const matchesSearch = m.nome.toLowerCase().includes(search.toLowerCase()) || 
      (m.email && m.email.toLowerCase().includes(search.toLowerCase())) ||
      (m.cargo && m.cargo.toLowerCase().includes(search.toLowerCase()));
    
    if (statusFilter === 'todos') return matchesSearch;
    return matchesSearch && m.status === statusFilter;
  });

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-1">Membros</p>
          <h2 className="text-3xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">Congregação</h2>
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
            <button
              onClick={handleNew}
              disabled={!selectedIgreja}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-md transition active:scale-95 text-sm uppercase tracking-wider cursor-pointer"
            >
              <Plus size={18} />
              Novo Membro
            </button>
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
              {currentMembro.id ? 'Editar Cadastro de Membro' : 'Novo Membro da Congregação'}
            </h3>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                placeholder="Ex Nome do Membro"
              />
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
                onChange={(e) => setCurrentMembro({ ...currentMembro, telefone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                placeholder="(00) 90000-0000"
              />
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
                Foto de Perfil (URL Opcional)
              </label>
              <input
                type="text"
                value={currentMembro.foto_url || ''}
                onChange={(e) => setCurrentMembro({ ...currentMembro, foto_url: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                placeholder="Link da imagem para foto"
              />
            </div>

            <div className="flex flex-col justify-center space-y-4 md:col-span-1 border border-slate-100 dark:border-slate-700/50 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="batizado_aguas"
                  checked={currentMembro.batizado_aguas || false}
                  onChange={(e) => setCurrentMembro({ ...currentMembro, batizado_aguas: e.target.checked })}
                  className="w-5 h-5 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                />
                <label htmlFor="batizado_aguas" className="text-sm font-bold text-slate-700 dark:text-slate-350 cursor-pointer">
                  Batizado nas Águas
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="batizado_espirito"
                  checked={currentMembro.batizado_espirito || false}
                  onChange={(e) => setCurrentMembro({ ...currentMembro, batizado_espirito: e.target.checked })}
                  className="w-5 h-5 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                />
                <label htmlFor="batizado_espirito" className="text-sm font-bold text-slate-700 dark:text-slate-350 cursor-pointer">
                  Batizado no Espírito Santo
                </label>
              </div>
            </div>
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
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar membro, e-mail ou cargo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-amber-500 transition-all"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              {['todos', 'Ativo', 'Inativo', 'Visitante'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
                    statusFilter === status
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300'
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-450 border border-slate-200 dark:border-slate-800'
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
                      <th className="px-6 py-4">Batismo (Água / Espírito)</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium text-slate-700 dark:text-slate-300">
                    {filteredMembros.map((m) => (
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
                                  Nasc: {new Date(m.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')}
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
                          <div className="flex gap-2">
                            {m.batizado_aguas ? (
                              <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/40">
                                <Check size={10} /> Água
                              </span>
                            ) : null}
                            {m.batizado_espirito ? (
                              <span className="flex items-center gap-1 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-900/40">
                                <Check size={10} /> Espírito
                              </span>
                            ) : null}
                            {!m.batizado_aguas && !m.batizado_espirito ? '-' : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(m)}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-50 dark:hover:bg-slate-900 transition rounded-lg"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id, m.nome)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-50 dark:hover:bg-slate-900 transition rounded-lg"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                        Filtrar por Ano
                      </label>
                      <select
                        value={reportYear}
                        onChange={(e) => setReportYear(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold text-sm"
                      >
                        <option value="todos">Todos os Anos</option>
                        {Array.from(new Set(
                          membros
                            .map(m => m.data_nascimento ? m.data_nascimento.split('-')[0] : null)
                            .filter((y): y is string => !!y)
                        ))
                          .sort((a, b) => b.localeCompare(a))
                          .map((year) => (
                            <option key={year} value={year}>{year}</option>
                          ))
                        }
                      </select>
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
