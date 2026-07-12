'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { useIgreja } from '@/context/IgrejaContext';
import { useAuth } from '@/context/AuthContext';
import { useConfirm } from '@/context/ConfirmContext';
import { 
  Plus, Trash2, TrendingUp, TrendingDown, Wallet, Calendar, Tag, RefreshCw, 
  Save, X, DollarSign, Upload, File, FileText, Check, AlertCircle, Link2, Settings, Briefcase, Landmark, Edit2, ChevronDown, Search, Printer,
  ChevronLeft, ChevronRight, Copy
} from 'lucide-react';
import dynamic from 'next/dynamic';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FinancialChart = dynamic(() => import('@/components/FinancialChart'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-[#94a3b8] text-xs">Carregando gráfico...</div>
});

type Transacao = {
  id: string;
  id_igreja: string;
  tipo: 'Entrada' | 'Saída';
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  membro_contribuinte?: string;
  
  // New upgraded schema fields
  id_forma_pagamento?: string | null;
  id_conta?: string | null;
  id_fornecedor?: string | null;
  id_centro_custo?: string | null;
  data_vencimento?: string | null;
  data_pagamento?: string | null;
  arquivos_transacao?: { id: string }[];
};

type Conta = {
  id: string;
  nome: string;
  banco: string | null;
  agencia: string | null;
  conta_corrente: string | null;
};

type Categoria = {
  id: string;
  nome: string;
  tipo: 'Crédito' | 'Débito';
};

type FormaPagamento = {
  id: string;
  nome: string;
};

type CentroCusto = {
  id: string;
  nome: string;
  sigla: string;
};

type ArquivoAnexo = {
  id?: string;
  nome_arquivo: string;
  url_arquivo: string;
};

export default function FinanceiroPage() {
  const { user, hasPermission } = useAuth();
  const { selectedIgreja } = useIgreja();
  const { confirmDelete } = useConfirm();
  const [activeTab, setActiveTab] = useState<'lancamentos' | 'contas' | 'categorias' | 'formas_pagamento' | 'centro_custo' | 'fluxo_caixa' | 'relatorios' | 'estatisticas_financeiras'>('lancamentos');
  
  // States specifically for the "Estatísticas Financeiras" Submodule
  const [statsDateInicio, setStatsDateInicio] = useState<string>(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [statsDateFim, setStatsDateFim] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // States specifically for the Reports Submodule
  const [reportDateInicio, setReportDateInicio] = useState<string>('');
  const [reportDateFim, setReportDateFim] = useState<string>('');
  const [reportCentroCusto, setReportCentroCusto] = useState<string>('');
  const [selectedReportType, setSelectedReportType] = useState<'contas_pagar' | 'contas_receber' | 'fluxo_caixa'>('contas_pagar');

  // States specifically for the Fluxo de Caixa Submodule
  const [fluxoPeriodoOpt, setFluxoPeriodoOpt] = useState<string>('Todo Período');
  const [fluxoPeriodoInicio, setFluxoPeriodoInicio] = useState<string>('');
  const [fluxoPeriodoFim, setFluxoPeriodoFim] = useState<string>('');
  const [fluxoCentroCusto, setFluxoCentroCusto] = useState<string>('');
  const [fluxoRefDate, setFluxoRefDate] = useState<Date>(new Date());

  // Checkbox selection state for batch actions
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  
  // Transactions data states
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [membros, setMembros] = useState<{ id: string; nome: string }[]>([]);

  // Submodules list database states
  const [dbCategorias, setDbCategorias] = useState<Categoria[]>([]);
  const [dbFormasPagamento, setDbFormasPagamento] = useState<FormaPagamento[]>([]);
  const [dbContas, setDbContas] = useState<Conta[]>([]);
  const [dbFornecedores, setDbFornecedores] = useState<any[]>([]);
  const [dbCentrosCusto, setDbCentrosCusto] = useState<CentroCusto[]>([]);

  // New submodules edit states
  const [editingConta, setEditingConta] = useState<Partial<Conta> | null>(null);
  const [editingCategoria, setEditingCategoria] = useState<Partial<Categoria> | null>(null);
  const [editingForma, setEditingForma] = useState<Partial<FormaPagamento> | null>(null);
  const [editingCentroCusto, setEditingCentroCusto] = useState<Partial<CentroCusto> | null>(null);

  // Form entries for upgraded transactions
  const [currentTransacao, setCurrentTransacao] = useState<Partial<Transacao>>({
    tipo: 'Entrada',
    categoria: '',
    descricao: '',
    valor: 0,
    data: '',
    membro_contribuinte: '',
    id_forma_pagamento: '',
    id_conta: '',
    id_fornecedor: '',
    id_centro_custo: '',
    data_vencimento: '',
    data_pagamento: ''
  });

  // Attachments state
  const [anexos, setAnexos] = useState<ArquivoAnexo[]>([]);
  const [novoAnexoNome, setNovoAnexoNome] = useState('');
  const [novoAnexoUrl, setNovoAnexoUrl] = useState('');
  const [showAnexosForm, setShowAnexosForm] = useState(false);
  const [activeTransacaoAnexos, setActiveTransacaoAnexos] = useState<ArquivoAnexo[]>([]);
  const [selectedTransacaoForAnexos, setSelectedTransacaoForAnexos] = useState<string | null>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Filter States
  const [filterTipo, setFilterTipo] = useState<string>('Todos');
  const [filterVencimentoOpt, setFilterVencimentoOpt] = useState<string>('Hoje');
  const [filterVencimentoInicio, setFilterVencimentoInicio] = useState<string>('');
  const [filterVencimentoFim, setFilterVencimentoFim] = useState<string>('');
  const [filterText, setFilterText] = useState<string>('');
  const [filterCategorias, setFilterCategorias] = useState<string[]>([]);
  const [filterFormasPagamento, setFilterFormasPagamento] = useState<string[]>([]);
  const [filterCentroCusto, setFilterCentroCusto] = useState<string>('');
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [showFormaDropdown, setShowFormaDropdown] = useState(false);
  const [showCCDropdown, setShowCCDropdown] = useState(false);

  // Navigation and Delete Confirm States
  const [vencimentoRefDate, setVencimentoRefDate] = useState<Date>(new Date());
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Reset vencimentoRefDate when filterVencimentoOpt shifts
  useEffect(() => {
    setVencimentoRefDate(new Date());
  }, [filterVencimentoOpt]);

  // Reset fluxoRefDate when fluxoPeriodoOpt shifts
  useEffect(() => {
    setFluxoRefDate(new Date());
  }, [fluxoPeriodoOpt]);

  // Pagination States
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset selected checkboxes when page, filters, or church changes
  useEffect(() => {
    setSelectedTransactionIds([]);
  }, [filterText, filterTipo, filterVencimentoOpt, filterCategorias, filterFormasPagamento, filterCentroCusto, currentPage, pageSize, selectedIgreja]);

  // Reset page when filters or pageSize change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterText, filterTipo, filterVencimentoOpt, filterCategorias, filterFormasPagamento, filterCentroCusto, pageSize]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auxiliary loaders
  const loadSubmodulesData = async () => {
    if (!selectedIgreja) return;
    try {
      // 1. Fetch Categorias
      const { data: catData } = await supabase
        .from('categorias')
        .select('*')
        .eq('id_igreja', selectedIgreja.id)
        .order('nome');
      if (catData) setDbCategorias(catData);

      // 2. Fetch Formas Pagamento
      const { data: formData } = await supabase
        .from('forma_pagamento')
        .select('*')
        .eq('id_igreja', selectedIgreja.id)
        .order('nome');
      if (formData) setDbFormasPagamento(formData);

      // 3. Fetch Contas
      const { data: contData } = await supabase
        .from('contas')
        .select('*')
        .eq('id_igreja', selectedIgreja.id)
        .order('nome');
      if (contData) setDbContas(contData);

      // 4. Fetch Fornecedores
      const { data: fornData } = await supabase
        .from('fornecedor')
        .select('*')
        .eq('id_igreja', selectedIgreja.id)
        .order('razao_social');
      if (fornData) setDbFornecedores(fornData || []);

      // 5. Fetch Centros de Custo
      const { data: ccData } = await supabase
        .from('centro_custos')
        .select('*')
        .eq('id_igreja', selectedIgreja.id)
        .order('nome');
      if (ccData) setDbCentrosCusto(ccData || []);
    } catch (e) {
      console.error('Error fetching submodules data:', e);
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

  const handleGenerateFinanceReport = async (type: 'contas_pagar' | 'contas_receber' | 'fluxo_caixa') => {
    try {
      // 1. Filter transactions by date period boundaries using due date as requested
      let filtered = [...transacoes];
      
      if (reportDateInicio) {
        filtered = filtered.filter(t => {
          if (!t.data_vencimento) return false;
          return t.data_vencimento >= reportDateInicio;
        });
      }
      if (reportDateFim) {
        filtered = filtered.filter(t => {
          if (!t.data_vencimento) return false;
          return t.data_vencimento <= reportDateFim;
        });
      }

      // Filter by Centro de Custo
      if (reportCentroCusto) {
        filtered = filtered.filter(t => t.id_centro_custo === reportCentroCusto);
      }
      
      // 2. Filter by type (Contas a Pagar: Débito/Saída, Contas a Receber: Crédito/Entrada, Fluxo Caixa: Todos)
      if (type === 'contas_pagar') {
        filtered = filtered.filter(t => t.tipo === 'Saída');
      } else if (type === 'contas_receber') {
        filtered = filtered.filter(t => t.tipo === 'Entrada');
      }
      
      // 3. Always sort by Expiration Date (Data Vencimento) ASCENDING (da menor para a maior data)
      filtered.sort((a, b) => {
        if (!a.data_vencimento && !b.data_vencimento) return 0;
        if (!a.data_vencimento) return 1;
        if (!b.data_vencimento) return -1;
        return a.data_vencimento.localeCompare(b.data_vencimento);
      });

      if (filtered.length === 0) {
        alert('Nenhum lançamento encontrado para a seleção de filtros atual.');
        return;
      }

      // Preload church logo
      let preloadedLogoImg: HTMLImageElement | null = null;
      if (selectedIgreja?.logo_url) {
        try {
          preloadedLogoImg = await loadImage(selectedIgreja.logo_url);
        } catch (e) {
          console.warn("Could not load church logo image: " + selectedIgreja.logo_url);
        }
      }
      if (!preloadedLogoImg) {
        try {
          preloadedLogoImg = await loadImage('https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=100&h=100&fit=crop');
        } catch (e) {
          console.warn("Could not load default church logo");
        }
      }

      let logoBase64 = '';
      if (preloadedLogoImg) {
        logoBase64 = getRoundedRectBase64(preloadedLogoImg, 0.2);
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const churchName = selectedIgreja?.nome || 'Minha Congregação';
      
      let docTitle = '';
      if (type === 'contas_pagar') {
        docTitle = 'RELATÓRIO DE CONTAS A PAGAR';
      } else if (type === 'contas_receber') {
        docTitle = 'RELATÓRIO DE CONTAS A RECEBER';
      } else {
        docTitle = 'RELATÓRIO DE FLUXO DE CAIXA CONSOLIDADO';
      }

      const periodStr = `${reportDateInicio ? new Date(reportDateInicio + 'T00:00:00').toLocaleDateString('pt-BR') : 'Início'} à ${reportDateFim ? new Date(reportDateFim + 'T00:00:00').toLocaleDateString('pt-BR') : 'Hoje'}`;
      docTitle += ` (${periodStr})`;

      const generationDate = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Header block card (white fill, black stroke matching other ready-made reports)
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(0, 0, 0); // Black lines (as linhas do cabeçalho)
      doc.setLineWidth(0.4);
      doc.rect(10, 10, 190, 24, 'FD');

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
      doc.text(`Gerado em: ${generationDate}  |  Total de Registros: ${filtered.length}`, textStartX, 29);

      // 5. Build Columns and rows
      let tableHeaders: string[] = [];
      let tableRows: any[][] = [];
      let totalSum = 0;

      if (type === 'contas_pagar') {
        tableHeaders = ['Vencimento', 'Lançamento (Descrição / Doc)', 'Categoria', 'Fornecedor', 'Valor'];
        tableRows = filtered.map(t => {
          const vencStr = t.data_vencimento ? new Date(t.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
          const docDateStr = t.data ? new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
          const descAndDoc = `${t.descricao} (Doc: ${docDateStr})`;
          
          const associatedForn = dbFornecedores.find(f => f.id === t.id_fornecedor);
          const fornecedorName = associatedForn ? associatedForn.razao_social : '-';
          const val = t.valor || 0;
          totalSum += val;

          return [
            vencStr,
            descAndDoc,
            t.categoria,
            fornecedorName,
            `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          ];
         });

        // Add Grand Total row at the end
        tableRows.push([
          'TOTAL',
          '',
          '',
          '',
          `R$ ${totalSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ]);

      } else if (type === 'contas_receber') {
        tableHeaders = ['Vencimento', 'Lançamento (Descrição / Doc)', 'Categoria', 'Cliente', 'Valor'];
        tableRows = filtered.map(t => {
          const vencStr = t.data_vencimento ? new Date(t.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
          const docDateStr = t.data ? new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
          const descAndDoc = `${t.descricao} (Doc: ${docDateStr})`;
          
          const clientName = t.membro_contribuinte || 'Coletivo / Caixa';
          const val = t.valor || 0;
          totalSum += val;

          return [
            vencStr,
            descAndDoc,
            t.categoria,
            clientName,
            `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          ];
         });

        // Add Grand Total row at the end
        tableRows.push([
          'TOTAL',
          '',
          '',
          '',
          `R$ ${totalSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ]);

      } else { // fluxo_caixa
        tableHeaders = ['Vencimento', 'Lançamento (Descrição / Doc)', 'Categoria', 'Cliente / Fornecedor', 'Tipo', 'Valor'];
        let totalEntradas = 0;
        let totalSaidas = 0;

        tableRows = filtered.map(t => {
          const vencStr = t.data_vencimento ? new Date(t.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
          const docDateStr = t.data ? new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
          const descAndDoc = `${t.descricao} (Doc: ${docDateStr})`;
          
          const associatedForn = dbFornecedores.find(f => f.id === t.id_fornecedor);
          const contactName = associatedForn ? associatedForn.razao_social : (t.membro_contribuinte || 'Coletivo / Caixa');
          const val = t.valor || 0;
          if (t.tipo === 'Entrada') {
            totalEntradas += val;
          } else {
            totalSaidas += val;
          }

          return [
            vencStr,
            descAndDoc,
            t.categoria,
            contactName,
            t.tipo === 'Entrada' ? 'Crédito' : 'Débito',
            `${t.tipo === 'Entrada' ? '+' : '-'} R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          ];
         });

        const netBalance = totalEntradas - totalSaidas;
        tableRows.push([
          'TOTAL CRÉDITO (RECEITAS)',
          '',
          '',
          '',
          '',
          `+ R$ ${totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ]);
        tableRows.push([
          'TOTAL DÉBITO (DESPESAS)',
          '',
          '',
          '',
          '',
          `- R$ ${totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ]);
        tableRows.push([
          'SALDO LÍQUIDO CONSOLIDADO',
          '',
          '',
          '',
          '',
          `${netBalance >= 0 ? '+' : '-'} R$ ${Math.abs(netBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ]);
      }

      autoTable(doc, {
        startY: 38,
        head: [tableHeaders],
        body: tableRows,
        theme: 'striped',
        headStyles: {
          fillColor: [0, 0, 0], // Pure Black background for head (as in other reports)
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
          textColor: [0, 0, 0], // black text
          lineColor: [180, 180, 180],
          lineWidth: 0.1,
        },
        styles: {
          font: 'helvetica',
          cellPadding: 3,
        },
        willDrawCell: (data) => {
          // Highlight total rows nicely
          const isTotalRow = data.row.index >= tableRows.length - (type === 'fluxo_caixa' ? 3 : 1);
          if (isTotalRow) {
            doc.setFont('helvetica', 'bold');
            data.cell.styles.fontStyle = 'bold';
            if (type === 'fluxo_caixa' && data.row.index === tableRows.length - 1) {
              data.cell.styles.fillColor = [230, 242, 230]; // Soft green for final balance if positive
            } else {
              data.cell.styles.fillColor = [245, 245, 245];
            }
          }
        },
        columnStyles: type === 'fluxo_caixa' ? {
          0: { cellWidth: 20 }, // Vencimento
          1: { cellWidth: 'auto' }, // Lançamento
          2: { cellWidth: 23 }, // Categoria
          3: { cellWidth: 35 }, // Contato
          4: { cellWidth: 20 }, // Tipo
          5: { cellWidth: 35, fontStyle: 'bold', halign: 'right' }, // Valor
        } : {
          0: { cellWidth: 22 }, // Vencimento
          1: { cellWidth: 'auto' }, // Lançamento
          2: { cellWidth: 28 }, // Categoria
          3: { cellWidth: 42 }, // Contato
          4: { cellWidth: 38, fontStyle: 'bold', halign: 'right' }, // Valor
        }
      });

      const nameMap = {
        contas_pagar: 'contas_a_pagar',
        contas_receber: 'contas_a_receber',
        fluxo_caixa: 'fluxo_caixa_consolidado'
      };

      doc.save(`relatorio_financeiro_${nameMap[type]}_${new Date().toISOString().substring(0, 10)}.pdf`);
      setSuccess('Relatório compilado e baixado com sucesso!');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao compilar documento de relatório PDF: ' + (err.message || err));
    }
  };

  const handlePrintReport = async () => {
    try {
      const filteredList = getFilteredTransactions();
      if (filteredList.length === 0) {
        alert('Nenhum lançamento encontrado para os filtros selecionados.');
        return;
      }

      // Preload church logo
      let preloadedLogoImg: HTMLImageElement | null = null;
      if (selectedIgreja?.logo_url) {
        try {
          preloadedLogoImg = await loadImage(selectedIgreja.logo_url);
        } catch (e) {
          console.warn("Could not load church logo image: " + selectedIgreja.logo_url);
        }
      }
      if (!preloadedLogoImg) {
        try {
          preloadedLogoImg = await loadImage('https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=100&h=100&fit=crop');
        } catch (e) {
          console.warn("Could not load default church logo");
        }
      }

      let logoBase64 = '';
      if (preloadedLogoImg) {
        logoBase64 = getRoundedRectBase64(preloadedLogoImg, 0.2);
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const churchName = selectedIgreja?.nome || 'Minha Congregação';
      const docTitle = 'RELATÓRIO FINANCEIRO DE LANÇAMENTOS';
      
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

      // Title & metrics texts
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
      doc.text(`Gerado em: ${generationDate}  |  Total de Lançamentos: ${filteredList.length}`, textStartX, 29);

      // Map rows for the table
      const tableHeaders = ['Vencimento', 'Lançamento (Descrição / Doc)', 'Categoria', 'Cliente / Fornecedor', 'Data Pgto.', 'Valor'];
      const tableRows = filteredList.map(t => {
        const vencStr = t.data_vencimento ? new Date(t.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
        const docDateStr = t.data ? new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
        const descAndDoc = `${t.descricao} (Doc: ${docDateStr})`;
        
        const associatedForn = dbFornecedores.find(f => f.id === t.id_fornecedor);
        const sourceDest = associatedForn ? associatedForn.razao_social : (t.membro_contribuinte || 'Coletivo / Caixa');
        const pgtoStr = t.data_pagamento ? new Date(t.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR') : 'Pendente';
        const valorFormatted = `${t.tipo === 'Entrada' ? '+' : '-'} R$ ${t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

        return [
          vencStr,
          descAndDoc,
          t.categoria,
          sourceDest,
          pgtoStr,
          valorFormatted
        ];
      });

      autoTable(doc, {
        startY: 38,
        head: [tableHeaders],
        body: tableRows,
        theme: 'striped',
        headStyles: {
          fillColor: [0, 0, 0], // Pure Black background for head!
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
          textColor: [0, 0, 0], // black text
          lineColor: [180, 180, 180],
          lineWidth: 0.1,
        },
        styles: {
          font: 'helvetica',
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 20 }, // Vencimento (fixed width)
          1: { cellWidth: 'auto' }, // Lançamento (Descrição / Doc) (flexible width)
          2: { cellWidth: 23 }, // Categoria (fixed width)
          3: { cellWidth: 38 }, // Cliente / Fornecedor (fixed width)
          4: { cellWidth: 20 }, // Data Pgto. (fixed width)
          5: { cellWidth: 37, fontStyle: 'bold', halign: 'right' }, // Valor (no wrapping, right aligned)
        }
      });

      doc.save(`relatorio_financeiro_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar relatório de impressão.');
    }
  };

  const fetchTransacoes = async () => {
    if (!selectedIgreja) return;
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('transacoes')
        .select('*, arquivos_transacao(id)')
        .eq('id_igreja', selectedIgreja.id)
        .order('data', { ascending: false });

      if (err) {
        if (err.code === 'PGRST205') {
          console.warn('Tabela transacoes não encontrada.');
          setTransacoes([]);
        } else {
          console.error(err);
        }
      } else if (data) {
        setTransacoes(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Load everything on church change
  useEffect(() => {
    if (selectedIgreja) {
      fetchTransacoes();
      loadSubmodulesData();
      
      // Fetch members for contributors list
      const fetchMembros = async () => {
        try {
          const { data } = await supabase
            .from('membros')
            .select('id, nome')
            .eq('id_igreja', selectedIgreja.id)
            .order('nome', { ascending: true });
          if (data) {
            setMembros(data);
          }
        } catch (e) {
          console.error(e);
        }
      };
      
      fetchMembros();
    } else {
      setTransacoes([]);
      setLoading(false);
    }
  }, [selectedIgreja]);

  // Load registered attachments for a specific transaction and open immediately
  const loadAttachmentsForTransacao = async (transacaoId: string) => {
    try {
      const { data, error } = await supabase
        .from('arquivos_transacao')
        .select('*')
        .eq('id_transacao', transacaoId);
      if (data && data.length > 0) {
        const firstUrl = data[0].url || data[0].url_arquivo || '';
        if (firstUrl) {
          window.open(firstUrl, '_blank');
        } else {
          alert('Link do arquivo não encontrado.');
        }
      } else {
        alert('Nenhum arquivo anexado a esta transação.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao carregar o arquivo.');
    }
  };

  const handleDelete = (id: string) => {
    confirmDelete({
      message: 'Deseja realmente remover este lançamento financeiro? Esta ação é irreversível.',
      onConfirm: async () => {
        try {
          // First delete associated attachments
          await supabase.from('arquivos_transacao').delete().eq('id_transacao', id);

          const { error: err } = await supabase.from('transacoes').delete().eq('id', id);
          if (err) throw err;
          const updated = transacoes.filter((t) => t.id !== id);
          setTransacoes(updated);
          setSuccess('Lançamento removido com sucesso!');
        } catch (e: any) {
          setError('Erro ao excluir transação: ' + (e.message || e));
        }
      }
    });
  };

  const handleEdit = async (transacao: Transacao) => {
    setCurrentTransacao({
      ...transacao,
      data: transacao.data || '',
      membro_contribuinte: transacao.membro_contribuinte || '',
      id_forma_pagamento: transacao.id_forma_pagamento || '',
      id_conta: transacao.id_conta || '',
      id_fornecedor: transacao.id_fornecedor || '',
      id_centro_custo: transacao.id_centro_custo || '',
      data_vencimento: transacao.data_vencimento || '',
      data_pagamento: transacao.data_pagamento || ''
    });

    // Load attachments from database for this transaction to allow editing
    try {
      const { data } = await supabase
        .from('arquivos_transacao')
        .select('*')
        .eq('id_transacao', transacao.id);
      if (data) {
        setAnexos(data.map((item: any) => ({
          id: item.id,
          nome_arquivo: item.nome || item.nome_arquivo || '',
          url_arquivo: item.url || item.url_arquivo || ''
        })));
      } else {
        setAnexos([]);
      }
    } catch (e) {
      setAnexos([]);
    }

    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleClone = async (transacao: Transacao) => {
    setCurrentTransacao({
      tipo: transacao.tipo,
      categoria: transacao.categoria || '',
      descricao: transacao.descricao,
      valor: transacao.valor || 0,
      data: transacao.data || new Date().toISOString().split('T')[0],
      membro_contribuinte: transacao.membro_contribuinte || '',
      id_forma_pagamento: transacao.id_forma_pagamento || '',
      id_conta: transacao.id_conta || '',
      id_fornecedor: transacao.id_fornecedor || '',
      id_centro_custo: transacao.id_centro_custo || '',
      data_vencimento: transacao.data_vencimento || '',
      data_pagamento: transacao.data_pagamento || ''
    });

    // Do not copy the files from the original record in the clone operation
    setAnexos([]);

    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleNew = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Choose initial category from DB if available, fallback otherwise
    const initialCategory = currentTransacao.tipo === 'Entrada'
      ? (dbCategorias.find(c => c.tipo === 'Crédito')?.nome || 'Dízimo')
      : (dbCategorias.find(c => c.tipo === 'Débito')?.nome || 'Aluguel');

    setCurrentTransacao({
      tipo: 'Entrada',
      categoria: initialCategory,
      descricao: '',
      valor: 0,
      data: todayStr,
      membro_contribuinte: '',
      id_forma_pagamento: dbFormasPagamento[0]?.id || '',
      id_conta: dbContas[0]?.id || '',
      id_fornecedor: '',
      id_centro_custo: '',
      data_vencimento: '',
      data_pagamento: ''
    });
    setAnexos([]);
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedIgreja) {
      setError('Selecione uma congregação.');
      return;
    }

    if (!currentTransacao.descricao) {
      setError('A descrição é obrigatória.');
      return;
    }

    const valorNum = Number(currentTransacao.valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      setError('Digite um valor numérico válido maior que zero.');
      return;
    }

    // Default category choice if none selected
    let chosenCat = currentTransacao.categoria;
    if (!chosenCat) {
      if (currentTransacao.tipo === 'Entrada') {
        chosenCat = dbCategorias.find(c => c.tipo === 'Crédito')?.nome || 'Dízimo';
      } else {
        chosenCat = dbCategorias.find(c => c.tipo === 'Débito')?.nome || 'Aluguel';
      }
    }

    const payload: any = {
      id_igreja: selectedIgreja.id,
      tipo: currentTransacao.tipo || 'Entrada',
      categoria: chosenCat,
      descricao: currentTransacao.descricao,
      valor: valorNum,
      data: currentTransacao.data || new Date().toISOString().split('T')[0],
      membro_contribuinte: currentTransacao.membro_contribuinte || null,
      
      // Upgraded attributes
      id_forma_pagamento: currentTransacao.tipo === 'Saída' ? (currentTransacao.id_forma_pagamento || null) : null,
      id_conta: currentTransacao.id_conta || null,
      id_fornecedor: currentTransacao.id_fornecedor || null,
      id_centro_custo: currentTransacao.id_centro_custo || null,
      data_vencimento: currentTransacao.data_vencimento || null,
      data_pagamento: currentTransacao.data_pagamento || null,
    };

    try {
      let savedTransacaoId = currentTransacao.id;

      if (currentTransacao.id) {
        const { error: err } = await supabase
          .from('transacoes')
          .update(payload)
          .eq('id', currentTransacao.id);
        if (err) throw err;
      } else {
        // Insert and grab ID
        const { data: insertedData, error: err } = await supabase
          .from('transacoes')
          .insert(payload)
          .select()
          .single();
        if (err) throw err;
        if (insertedData) {
          savedTransacaoId = insertedData.id;
        }
      }

      // Handle storing files/attachments in support table 'arquivos_transacao'
      if (savedTransacaoId) {
        // First delete stale attachments for this transaction to allow rewrite/overriding
        await supabase.from('arquivos_transacao').delete().eq('id_transacao', savedTransacaoId);
        
        if (anexos.length > 0) {
          const filesPayload = anexos.map(anexo => ({
            id_transacao: savedTransacaoId,
            nome: anexo.nome_arquivo,
            url: anexo.url_arquivo
          }));
          const { error: insertErr } = await supabase.from('arquivos_transacao').insert(filesPayload);
          if (insertErr) throw insertErr;
        }
      }

      setSuccess('Lançamento financeiro registrado com sucesso!');
      setIsEditing(false);
      fetchTransacoes();
    } catch (e: any) {
      console.error(e);
      setError('Erro ao salvar no banco: ' + (e.message || e));
    }
  };

  const handleTipoChange = (newTipo: 'Entrada' | 'Saída') => {
    // Attempt dynamic categories from database
    const dynamicCats = dbCategorias.filter(c => c.tipo === (newTipo === 'Entrada' ? 'Crédito' : 'Débito'));
    const initialCategory = dynamicCats.length > 0 ? dynamicCats[0].nome : (newTipo === 'Entrada' ? 'Dízimo' : 'Aluguel');

    setCurrentTransacao(prev => ({
      ...prev,
      tipo: newTipo,
      categoria: initialCategory,
      membro_contribuinte: '',
      id_fornecedor: ''
    }));
  };

  // Add attachment to form list
  const handleAdicionarAnexo = () => {
    if (!novoAnexoNome || !novoAnexoUrl) {
      alert('Por favor, informe um nome descritivo e uma URL para o arquivo.');
      return;
    }
    setAnexos(prev => [...prev, { nome_arquivo: novoAnexoNome, url_arquivo: novoAnexoUrl }]);
    setNovoAnexoNome('');
    setNovoAnexoUrl('');
    setShowAnexosForm(false);
  };

  const handleRemoverAnexo = (index: number) => {
    setAnexos(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileSelection = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    
    setIsUploading(true);
    setError('');
    
    for (const file of selectedFiles) {
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
          setAnexos(prev => [...prev, {
            nome_arquivo: file.name,
            url_arquivo: result.url
          }]);
          setSuccess(`Sucesso: "${file.name}" foi salvo com segurança no Supabase Storage!`);
        } else {
          throw new Error('Formato de resposta inválido do servidor ao carregar .');
        }
      } catch (err: any) {
        console.error('Erro de upload ao Supabase:', err);
        setError(`Erro no upload de "${file.name}": ${err.message || err}`);
      }
    }
    
    setIsUploading(false);
  };

  const getFilteredTransactions = () => {
    const filtered = transacoes.filter((t) => {
      // 0. Tipo filter
      if (filterTipo !== 'Todos') {
        if (t.tipo !== filterTipo) return false;
      }

      // 1. Text filter
      if (filterText) {
        const text = filterText.toLowerCase();
        const valueStr = t.valor ? t.valor.toString() : '';
        const dateStr = t.data ? new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
        const vencStr = t.data_vencimento ? new Date(t.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '';
        const pagStr = t.data_pagamento ? new Date(t.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR') : '';
        
        const associatedLabel = dbFornecedores.find(f => f.id === t.id_fornecedor)?.razao_social || '';
        const contributorLabel = t.membro_contribuinte || '';
        
        const matches = 
          (t.descricao || '').toLowerCase().includes(text) ||
          (t.categoria || '').toLowerCase().includes(text) ||
          associatedLabel.toLowerCase().includes(text) ||
          contributorLabel.toLowerCase().includes(text) ||
          valueStr.includes(text) ||
          dateStr.includes(text) ||
          vencStr.includes(text) ||
          pagStr.includes(text);
          
        if (!matches) return false;
      }

      // 2. Category filter
      if (filterCategorias.length > 0) {
        if (!filterCategorias.includes(t.categoria)) {
          return false;
        }
      }

      // 3. Payment Method filter
      if (filterFormasPagamento.length > 0) {
        if (!t.id_forma_pagamento || !filterFormasPagamento.includes(t.id_forma_pagamento)) {
          return false;
        }
      }

      // 3.5. Centro de Custo filter
      if (filterCentroCusto) {
        if (t.id_centro_custo !== filterCentroCusto) {
          return false;
        }
      }

      // 4. Expiration Date (Data Vencimento) Filter
      if (filterVencimentoOpt !== 'Todo Período') {
        if (!t.data_vencimento) {
          return false;
        }
        
        const tDate = new Date(t.data_vencimento + 'T00:00:00');
        const now = new Date(vencimentoRefDate);
        now.setHours(0, 0, 0, 0);
        
        if (filterVencimentoOpt === 'Hoje') {
          const tDateStr = t.data_vencimento;
          const todayStr = now.toISOString().split('T')[0];
          if (tDateStr !== todayStr) return false;
        } else if (filterVencimentoOpt === 'Semana') {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          if (tDate < startOfWeek || tDate > endOfWeek) return false;
        } else if (filterVencimentoOpt === 'Mês') {
          if (tDate.getMonth() !== now.getMonth() || tDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (filterVencimentoOpt === 'Ano') {
          if (tDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (filterVencimentoOpt === '30 Últimos Dias') {
          const thirtyDaysAgo = new Date(now);
          thirtyDaysAgo.setDate(now.getDate() - 30);
          if (tDate < thirtyDaysAgo || tDate > now) return false;
        } else if (filterVencimentoOpt === '12 Últimos Meses') {
          const twelveMonthsAgo = new Date(now);
          twelveMonthsAgo.setMonth(now.getMonth() - 12);
          if (tDate < twelveMonthsAgo || tDate > now) return false;
        } else if (filterVencimentoOpt === 'Personalizado') {
          if (filterVencimentoInicio) {
            const start = new Date(filterVencimentoInicio + 'T00:00:00');
            if (tDate < start) return false;
          }
          if (filterVencimentoFim) {
            const end = new Date(filterVencimentoFim + 'T23:59:59');
            if (tDate > end) return false;
          }
        }
      }

      return true;
    });

    // 5. Always sort by Expiration Date (Data Vencimento) in ASCENDING order (da menor para a maior data)
    return filtered.sort((a, b) => {
      if (!a.data_vencimento && !b.data_vencimento) return 0;
      if (!a.data_vencimento) return 1; // Put records without a due date at the end
      if (!b.data_vencimento) return -1;
      
      const dateA = new Date(a.data_vencimento + 'T00:00:00').getTime();
      const dateB = new Date(b.data_vencimento + 'T00:00:00').getTime();
      return dateA - dateB;
    });
  };

  // Submodule accounts (contas) CRUD Actions
  const handleSaveConta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConta?.nome || !selectedIgreja) return;
    try {
      const payload = {
        id_igreja: selectedIgreja.id,
        nome: editingConta.nome,
        banco: editingConta.banco || null,
        agencia: editingConta.agencia || null,
        conta_corrente: editingConta.conta_corrente || null
      };

      if (editingConta.id) {
        await supabase.from('contas').update(payload).eq('id', editingConta.id);
      } else {
        await supabase.from('contas').insert([payload]);
      }
      setEditingConta(null);
      loadSubmodulesData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteConta = (id: string) => {
    confirmDelete({
      message: 'Deseja realmente remover esta conta? Esta ação é irreversível.',
      onConfirm: async () => {
        try {
          await supabase.from('contas').delete().eq('id', id);
          loadSubmodulesData();
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Submodule categories CRUD Actions
  const handleSaveCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategoria?.nome || !selectedIgreja) return;
    try {
      const payload = {
        id_igreja: selectedIgreja.id,
        nome: editingCategoria.nome,
        tipo: editingCategoria.tipo || 'Crédito'
      };

      if (editingCategoria.id) {
        await supabase.from('categorias').update(payload).eq('id', editingCategoria.id);
      } else {
        await supabase.from('categorias').insert([payload]);
      }
      setEditingCategoria(null);
      loadSubmodulesData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCategoria = (id: string) => {
    confirmDelete({
      message: 'Deseja realmente remover esta categoria? Esta ação é irreversível.',
      onConfirm: async () => {
        try {
          await supabase.from('categorias').delete().eq('id', id);
          loadSubmodulesData();
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Submodule payment methods CRUD Actions
  const handleSaveForma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingForma?.nome || !selectedIgreja) return;
    try {
      const payload = { 
        id_igreja: selectedIgreja.id,
        nome: editingForma.nome 
      };
      let saveError = null;

      if (editingForma.id) {
        const { error: err } = await supabase.from('forma_pagamento').update(payload).eq('id', editingForma.id);
        saveError = err;
      } else {
        const { error: err } = await supabase.from('forma_pagamento').insert([payload]);
        saveError = err;
      }

      if (saveError) {
        alert('Erro ao salvar forma de pagamento.');
      } else {
        setEditingForma(null);
        loadSubmodulesData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteForma = (id: string) => {
    confirmDelete({
      message: 'Deseja realmente remover esta forma de pagamento? Esta ação é irreversível.',
      onConfirm: async () => {
        try {
          const { error: err } = await supabase.from('forma_pagamento').delete().eq('id', id);
          if (err) throw err;
          loadSubmodulesData();
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Submodule Centro de Custo CRUD Actions
  const handleSaveCentroCusto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCentroCusto?.nome || !editingCentroCusto?.sigla || !selectedIgreja) return;
    try {
      const payload = { 
        id_igreja: selectedIgreja.id,
        nome: editingCentroCusto.nome,
        sigla: editingCentroCusto.sigla
      };
      let saveError = null;

      if (editingCentroCusto.id) {
        const { error: err } = await supabase.from('centro_custos').update(payload).eq('id', editingCentroCusto.id);
        saveError = err;
      } else {
        const { error: err } = await supabase.from('centro_custos').insert([payload]);
        saveError = err;
      }

      if (saveError) {
        alert('Erro ao salvar Centro de Custo.');
      } else {
        setEditingCentroCusto(null);
        loadSubmodulesData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCentroCusto = (id: string) => {
    confirmDelete({
      message: 'Deseja realmente remover este Centro de Custo? Esta ação é irreversível.',
      onConfirm: async () => {
        try {
          const { error: err } = await supabase.from('centro_custos').delete().eq('id', id);
          if (err) throw err;
          loadSubmodulesData();
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Batch Payment Actions
  const handleBatchMarkPaid = async () => {
    if (selectedTransactionIds.length === 0) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { error: err } = await supabase
        .from('transacoes')
        .update({ data_pagamento: todayStr })
        .in('id', selectedTransactionIds);

      if (err) throw err;
      
      setSuccess(`${selectedTransactionIds.length} lançamento(s) registrado(s) como pago(s)!`);
      setSelectedTransactionIds([]);
      fetchTransacoes();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao registrar pagamentos: ' + (err.message || err));
    }
  };

  const handleBatchMarkUnpaid = async () => {
    if (selectedTransactionIds.length === 0) return;
    try {
      const { error: err } = await supabase
        .from('transacoes')
        .update({ data_pagamento: null })
        .in('id', selectedTransactionIds);

      if (err) throw err;

      setSuccess(`${selectedTransactionIds.length} lançamento(s) alterado(s) para pendente(s)!`);
      setSelectedTransactionIds([]);
      fetchTransacoes();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao remover pagamentos: ' + (err.message || err));
    }
  };

  // Balances calculation
  const totalEntradas = transacoes
    .filter((t) => t.tipo === 'Entrada')
    .reduce((sum, t) => sum + t.valor, 0);

  const totalSaidas = transacoes
    .filter((t) => t.tipo === 'Saída')
    .reduce((sum, t) => sum + t.valor, 0);

  const saldoTotal = totalEntradas - totalSaidas;

  // Chart data computation
  const dataMap: Record<string, { Entrada: number; Saída: number }> = {};
  transacoes.forEach((t) => {
    const d = t.data ? t.data.substring(5, 10) : 'Geral'; // MM-DD format
    if (!dataMap[d]) {
      dataMap[d] = { Entrada: 0, Saída: 0 };
    }
    dataMap[d][t.tipo] += t.valor;
  });

  const chartData = Object.entries(dataMap)
    .map(([data, values]) => ({
      data: data.replace('-', '/'),
      ...values,
    }))
    .reverse()
    .slice(-8); // Get latest 8 active days;

  // Filtered list of transactions specifically for Cash Flow Submodule
  const getFilteredFluxoTransactions = () => {
    let list = [...transacoes];

    // Filter by selected church
    if (selectedIgreja) {
      list = list.filter(t => t.id_igreja === selectedIgreja.id);
    }

    // Filter by Centro de Custo
    if (fluxoCentroCusto) {
      list = list.filter(t => t.id_centro_custo === fluxoCentroCusto);
    }

    // Filter by Period
    if (fluxoPeriodoOpt !== 'Todo Período') {
      const ref = new Date(fluxoRefDate);
      const year = ref.getFullYear();
      const month = ref.getMonth();
      const date = ref.getDate();

      let startLimit = '';
      let endLimit = '';

      if (fluxoPeriodoOpt === 'Hoje') {
        const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
        startLimit = todayStr;
        endLimit = todayStr;
      } else if (fluxoPeriodoOpt === 'Semana') {
        const startOfWeek = new Date(ref);
        startOfWeek.setDate(date - ref.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        startLimit = startOfWeek.toISOString().split('T')[0];
        endLimit = endOfWeek.toISOString().split('T')[0];
      } else if (fluxoPeriodoOpt === 'Mês') {
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0);
        startLimit = startOfMonth.toISOString().split('T')[0];
        endLimit = endOfMonth.toISOString().split('T')[0];
      } else if (fluxoPeriodoOpt === 'Ano') {
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31);
        startLimit = startOfYear.toISOString().split('T')[0];
        endLimit = endOfYear.toISOString().split('T')[0];
      } else if (fluxoPeriodoOpt === '30 Últimos Dias') {
        const start = new Date(ref);
        start.setDate(date - 30);
        startLimit = start.toISOString().split('T')[0];
        endLimit = ref.toISOString().split('T')[0];
      } else if (fluxoPeriodoOpt === '12 Últimos Meses') {
        const start = new Date(ref);
        start.setMonth(ref.getMonth() - 12);
        startLimit = start.toISOString().split('T')[0];
        endLimit = ref.toISOString().split('T')[0];
      } else if (fluxoPeriodoOpt === 'Personalizado') {
        startLimit = fluxoPeriodoInicio;
        endLimit = fluxoPeriodoFim;
      }

      if (startLimit) {
        list = list.filter(t => t.data_vencimento && t.data_vencimento >= startLimit);
      }
      if (endLimit) {
        list = list.filter(t => t.data_vencimento && t.data_vencimento <= endLimit);
      }
    }

    return list;
  };

  const fluxoList = getFilteredFluxoTransactions();
  const fluxoTotalEntradas = fluxoList
    .filter((t) => t.tipo === 'Entrada')
    .reduce((sum, t) => sum + t.valor, 0);

  const fluxoTotalSaidas = fluxoList
    .filter((t) => t.tipo === 'Saída')
    .reduce((sum, t) => sum + t.valor, 0);

  const fluxoSaldoTotal = fluxoTotalEntradas - fluxoTotalSaidas;

  // Chart data computation for Fluxo de Caixa
  const fluxoDataMap: Record<string, { Entrada: number; Saída: number }> = {};
  fluxoList.forEach((t) => {
    const d = t.data ? t.data.substring(5, 10) : 'Geral'; // MM-DD format
    if (!fluxoDataMap[d]) {
      fluxoDataMap[d] = { Entrada: 0, Saída: 0 };
    }
    fluxoDataMap[d][t.tipo] += t.valor;
  });

  const fluxoChartData = Object.entries(fluxoDataMap)
    .map(([data, values]) => ({
      data: data.replace('-', '/'),
      ...values,
    }))
    .reverse()
    .slice(-10); // Get latest 10 active days for the flux

  if (!user?.id_master && !user?.is_admin && !hasPermission('/financeiro')) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center py-20">
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-3xl p-12 shadow-sm space-y-4 max-w-xl mx-auto">
          <div className="p-4 bg-red-100 dark:bg-red-900/40 rounded-full w-16 h-16 flex items-center justify-center mx-auto text-red-650">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-850 dark:text-white">Acesso Negado</h3>
          <p className="text-sm text-slate-550 dark:text-slate-400 leading-relaxed">
            Você não possui permissão para acessar a Gestão Financeira. Entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  const filteredTransactions = getFilteredTransactions();
  const totalRecords = filteredTransactions.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const paginatedTransactions = filteredTransactions.slice((activePage - 1) * pageSize, activePage * pageSize);

  // Compute metrics for the filtered transactions
  const todayObj = new Date(vencimentoRefDate);
  const year = todayObj.getFullYear();
  const month = String(todayObj.getMonth() + 1).padStart(2, '0');
  const day = String(todayObj.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  let creditAVencer = 0;
  let creditHoje = 0;
  let creditVencido = 0;
  let creditPago = 0;
  let creditTotal = 0;

  let debitAVencer = 0;
  let debitHoje = 0;
  let debitVencido = 0;
  let debitPago = 0;
  let debitTotal = 0;

  filteredTransactions.forEach((t) => {
    const valor = Number(t.valor || 0);
    if (t.tipo === 'Entrada') {
      creditTotal += valor;
      if (t.data_pagamento) {
        creditPago += valor;
      } else if (t.data_vencimento) {
        if (t.data_vencimento === todayStr) {
          creditHoje += valor;
        } else if (t.data_vencimento > todayStr) {
          creditAVencer += valor;
        } else {
          creditVencido += valor;
        }
      }
    } else if (t.tipo === 'Saída') {
      debitTotal += valor;
      if (t.data_pagamento) {
        debitPago += valor;
      } else if (t.data_vencimento) {
        if (t.data_vencimento === todayStr) {
          debitHoje += valor;
        } else if (t.data_vencimento > todayStr) {
          debitAVencer += valor;
        } else {
          debitVencido += valor;
        }
      }
    }
  });

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-1">Módulo Financeiro</p>
          <h2 className="text-3xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">Finanças Integradas</h2>
          <p className="text-slate-500 text-sm">
            Caixa geral, contas bancárias, categorias e comprovantes anexos
          </p>
        </div>

        {/* Tab Selector */}
        {!isEditing && (
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('lancamentos')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'lancamentos' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Lançamentos
            </button>
            {(user?.id_master || user?.is_admin || hasPermission('/financeiro') || hasPermission('/financeiro/fluxo_caixa')) && (
              <button
                onClick={() => setActiveTab('fluxo_caixa')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'fluxo_caixa' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Fluxo de Caixa
              </button>
            )}
            {(user?.id_master || user?.is_admin || hasPermission('/financeiro/contas')) && (
              <button
                onClick={() => setActiveTab('contas')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'contas' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Contas
              </button>
            )}
            {(user?.id_master || user?.is_admin || hasPermission('/financeiro/categorias')) && (
              <button
                onClick={() => setActiveTab('categorias')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'categorias' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Categorias
              </button>
            )}
            {(user?.id_master || user?.is_admin || hasPermission('/financeiro/formas_pagamento')) && (
               <button
                 onClick={() => setActiveTab('formas_pagamento')}
                 className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                   activeTab === 'formas_pagamento' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                 }`}
               >
                 Formas de Pagamento
               </button>
             )}
            {(user?.id_master || user?.is_admin || hasPermission('/financeiro/centro_custo')) && (
               <button
                 onClick={() => setActiveTab('centro_custo')}
                 className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                   activeTab === 'centro_custo' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                 }`}
               >
                 Centro de Custo
               </button>
             )}
             <button
               onClick={() => setActiveTab('relatorios')}
               className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                 activeTab === 'relatorios' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
               }`}
             >
               Relatórios
             </button>
              <button
                onClick={() => setActiveTab('estatisticas_financeiras')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'estatisticas_financeiras' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
              >
                Estatísticas
              </button>
           </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-black dark:text-black font-bold text-sm flex items-center gap-2">
          <AlertCircle size={18} className="text-red-600 dark:text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-black dark:text-black font-bold text-sm flex items-center gap-2">
          <Check size={18} className="text-green-600 dark:text-green-400" />
          <span>{success}</span>
        </div>
      )}

      {/* RENDER ACTIVE TAB VIEW */}

      {activeTab === 'lancamentos' && (
        <>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-700 pb-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {currentTransacao.id ? 'Editar Lançamento Financeiro' : 'Sinalizar Novo Lançamento Financeiro'}
                </h3>
                <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Tipo de Transação *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleTipoChange('Entrada')}
                      className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider border-2 transition-all ${
                        currentTransacao.tipo === 'Entrada'
                          ? 'bg-green-100 text-green-850 border-green-500 shadow-sm'
                          : 'border-slate-100 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      Crédito (Entrada)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTipoChange('Saída')}
                      className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider border-2 transition-all ${
                        currentTransacao.tipo === 'Saída'
                          ? 'bg-red-50 text-red-775 border-red-500 shadow-sm'
                          : 'border-slate-100 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      Débito (Saída)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Categoria do Lançamento *
                  </label>
                  <select
                    value={currentTransacao.categoria || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, categoria: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                    required
                  >
                    <option value="" disabled>Selecione uma categoria</option>
                    {dbCategorias.filter(c => c.tipo === (currentTransacao.tipo === 'Entrada' ? 'Crédito' : 'Débito')).length > 0 ? (
                      dbCategorias
                        .filter(c => c.tipo === (currentTransacao.tipo === 'Entrada' ? 'Crédito' : 'Débito'))
                        .map(c => (
                          <option key={c.id} value={c.nome}>{c.nome}</option>
                        ))
                    ) : (
                      // Fallback categories if empty
                      currentTransacao.tipo === 'Entrada' ? (
                        <>
                          <option value="Dízimo">Dízimo Ordinário</option>
                          <option value="Oferta">Oferta Voluntária</option>
                          <option value="Doação">Doação Externa</option>
                          <option value="Evento">Arrecadação de Evento</option>
                          <option value="Outros">Outras Entradas</option>
                        </>
                      ) : (
                        <>
                          <option value="Aluguel">Aluguel do Salão</option>
                          <option value="Energia">Água e Energia</option>
                          <option value="Som e Luz">Equipamentos Som / Luz</option>
                          <option value="Eventos">Ajuda de Custo Eventos</option>
                          <option value="Manutenção">Manutenção Predial</option>
                          <option value="Missionário">Apoio Missionário</option>
                          <option value="Outros">Outras Despesas</option>
                        </>
                      )
                    )}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Descrição ou Observações *
                  </label>
                  <input
                    type="text"
                    required
                    value={currentTransacao.descricao || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, descricao: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold shadow-inner"
                    placeholder="Ex. Pagamento fatura de serviços, compra insumos"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Valor do Lançamento (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={currentTransacao.valor || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, valor: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-black text-lg"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Conta Bancária Associada *
                  </label>
                  <select
                    value={currentTransacao.id_conta || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, id_conta: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                  >
                    <option value="">Selecione uma conta</option>
                    {dbContas.map(conta => (
                      <option key={conta.id} value={conta.id}>{conta.nome} {conta.banco ? `(${conta.banco})` : ''}</option>
                    ))}
                    {dbContas.length === 0 && (
                      <>
                        <option value="principal">Caixa Principal Geral</option>
                        <option value="secundario">Conta Corrente de Apoio</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Centro de Custo
                  </label>
                  <select
                    value={currentTransacao.id_centro_custo || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, id_centro_custo: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                  >
                    <option value="">Selecione um Centro de Custo</option>
                    {dbCentrosCusto.map(cc => (
                      <option key={cc.id} value={cc.id}>{cc.nome} ({cc.sigla})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Data do Documento
                  </label>
                  <input
                    type="date"
                    required
                    value={currentTransacao.data || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, data: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={currentTransacao.data_vencimento || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, data_vencimento: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    {currentTransacao.tipo === 'Saída' ? 'Data de Pagamento (Quitação)' : 'Data de Recebimento (Quitação)'}
                  </label>
                  <input
                    type="date"
                    value={currentTransacao.data_pagamento || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, data_pagamento: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                  />
                </div>

                {/* Conditional payments methods combo: ONLY display when type is "Saída/Débito" */}
                {currentTransacao.tipo === 'Saída' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                      Forma de Pagamento (Débito)*
                    </label>
                    <select
                      value={currentTransacao.id_forma_pagamento || ''}
                      onChange={(e) => setCurrentTransacao({ ...currentTransacao, id_forma_pagamento: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold animate-in fade-in duration-200"
                    >
                      <option value="">Selecione forma de pagamento</option>
                      {dbFormasPagamento.map(forma => (
                        <option key={forma.id} value={forma.id}>{forma.nome}</option>
                      ))}
                      {dbFormasPagamento.length === 0 && (
                        <>
                          <option value="Dinheiro">Dinheiro vivo</option>
                          <option value="PIX">PIX instantâneo</option>
                          <option value="Transferência">TED / DOC</option>
                          <option value="Cartão">Cartão de Crédito/Débito</option>
                        </>
                      )}
                    </select>
                  </div>
                )}

                {/* Cliente/Fornecedor Selector based on transaction type (Clent if Entrada, Supplier if Saída) */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    {currentTransacao.tipo === 'Entrada' ? 'Cliente / Doadores Estrela' : 'Fornecedor Credor *'}
                  </label>
                  <select
                    value={currentTransacao.id_fornecedor || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, id_fornecedor: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                  >
                    <option value="">Selecione um {currentTransacao.tipo === 'Entrada' ? 'Cliente' : 'Fornecedor'}</option>
                    {dbFornecedores.map(forn => (
                      <option key={forn.id} value={forn.id}>{forn.razao_social} {forn.cpf_cnpj ? `(${forn.cpf_cnpj})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Contribuição Nominal de Membro (Caso aplicável - Opcional)
                  </label>
                  <select
                    value={currentTransacao.membro_contribuinte || ''}
                    onChange={(e) => setCurrentTransacao({ ...currentTransacao, membro_contribuinte: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                  >
                    <option value="">Anônimo / Contribuição Coletiva</option>
                    {membros.map((m) => (
                      <option key={m.id} value={m.nome}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SUPPORT FILE UPLOAD SYSTEM (arquivos_transacao storage) */}
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
                       const files = Array.from(e.dataTransfer.files);
                       handleFileSelection(files);
                     }
                   }}
                   onClick={() => {
                     if (!isUploading) {
                       document.getElementById('file-upload-input')?.click();
                     }
                   }}
                   className={`md:col-span-2 p-6 rounded-2xl border-2 border-dashed transition-all duration-200 space-y-4 ${
                     isDragging 
                       ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 cursor-pointer' 
                       : isUploading
                         ? 'border-amber-500/50 bg-amber-500/5 dark:bg-amber-950/5 cursor-wait opacity-80'
                         : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:border-amber-500/55 cursor-pointer'
                   }`}
                 >
                   <input
                     type="file"
                     id="file-upload-input"
                     className="hidden"
                     multiple
                     disabled={isUploading}
                     onClick={(e) => e.stopPropagation()}
                     onChange={(e) => {
                       if (e.target.files && e.target.files.length > 0) {
                         handleFileSelection(Array.from(e.target.files));
                       }
                     }}
                   />
                   
                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" onClick={(e) => e.stopPropagation()}>
                     <div className="flex-1">
                       <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                         {isUploading ? (
                           <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                         ) : (
                           <Upload size={14} className="text-amber-500" />
                         )}
                         Comprovantes & Anexos Financeiros {isUploading && <span className="text-amber-500 font-bold ml-1 animate-pulse">(Enviando para o Supabase...)</span>}
                       </h4>
                       {isUploading ? (
                         <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                           Enviando anexo de forma segura para os servidores do **Supabase Storage**, por favor aguarde...
                         </p>
                       ) : (
                         <p className="text-[11px] text-slate-450 mt-0.5">
                           Arraste e solte arquivos aqui, ou <span className="text-amber-600 dark:text-amber-400 font-bold underline cursor-pointer" onClick={() => document.getElementById('file-upload-input')?.click()}>clique para selecionar</span>.
                         </p>
                       )}
                     </div>
                     {!isUploading && (
                       <button
                         type="button"
                         onClick={() => setShowAnexosForm(!showAnexosForm)}
                         className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors"
                       >
                         {showAnexosForm ? 'Esconder Formulário' : 'Adicionar Anexo URL'}
                       </button>
                     )}
                    </div>

                    {showAnexosForm && (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Título do Documento</label>
                          <input
                            type="text"
                            value={novoAnexoNome}
                            onChange={(e) => setNovoAnexoNome(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-650 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                            placeholder="Ex: Recibo de Luz.pdf"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">URL Completa / Caminho do Arquivo</label>
                          <input
                            type="text"
                            value={novoAnexoUrl}
                            onChange={(e) => setNovoAnexoUrl(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-650 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                            placeholder="https://servidor.com/recibo.pdf"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            // Quick simulation generator helper if empty
                            setNovoAnexoNome(`Comprovante_${Math.floor(1000 + Math.random() * 9000)}.pdf`);
                            setNovoAnexoUrl(`https://churchdocs.net/mock-upload/recibo-${Date.now()}.png`);
                          }}
                          className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-300 font-bold text-[10px] rounded"
                        >
                          Simular Gerar Mock URL
                        </button>
                        <button
                          type="button"
                          onClick={handleAdicionarAnexo}
                          className="px-4 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded"
                        >
                          Confirmar Inserção
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Attached files items tree list */}
                  {anexos.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-2">Sem anexos registrados para esta transação.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                      {anexos.map((anexo, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs">
                          <div className="flex items-center gap-2 max-w-[80%]">
                            <FileText size={16} className="text-amber-500 flex-shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{anexo.nome_arquivo}</p>
                              <a href={anexo.url_arquivo} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline hover:text-blue-600 font-normal leading-none inline-flex items-center gap-0.5">
                                Ver link arquivo
                                <Link2 size={10} />
                              </a>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoverAnexo(idx)}
                            className="p-1 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                  className="flex items-center gap-2 bg-amber-600 text-white px-8 py-3 rounded-xl font-black transition-all shadow-md hover:bg-amber-700 uppercase text-xs tracking-widest"
                >
                  <Save size={16} />
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Bento-grid of balances */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Receitas</span>
                    <p className="text-3xl font-black text-black dark:text-white">R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="w-12 h-12 bg-transparent text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center">
                    <TrendingUp size={24} />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Despesas</span>
                    <p className="text-3xl font-black text-black dark:text-white">R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="w-12 h-12 bg-transparent text-red-500 dark:text-red-400 rounded-2xl flex items-center justify-center">
                    <TrendingDown size={24} />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Saldo Consolidado</span>
                    <p className="text-3xl font-black text-black dark:text-white">R$ {saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="w-12 h-12 bg-transparent text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                    <Wallet size={24} />
                  </div>
                </div>
              </div>

              {/* Action Button Trigger */}
              <div className="flex justify-end pr-1">
                <button
                  onClick={handleNew}
                  disabled={!selectedIgreja}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-md transition active:scale-95 text-xs uppercase tracking-wider"
                >
                  <Plus size={18} />
                  Novo Lançamento
                </button>
              </div>

              {/* Modal showing attachments on transaction list row click */}
              {selectedTransacaoForAnexos && (
                <div className="bg-amber-500/5 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-2xl p-5 mb-4 animate-in fade-in duration-250">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-amber-500/10">
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <File size={16} />
                      Anexos Vinculados à Transação
                    </span>
                    <button
                      onClick={() => setSelectedTransacaoForAnexos(null)}
                      className="text-slate-400 hover:text-slate-650"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {activeTransacaoAnexos.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Nenhum arquivo de apoio anexado a esse lançamento financeiro.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {activeTransacaoAnexos.map((anexo) => (
                        <div key={anexo.id} className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800 shadow-3xs">
                          <FileText size={20} className="text-amber-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-850 dark:text-white truncate">{anexo.nome_arquivo}</p>
                            <a
                              href={anexo.url_arquivo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-blue-500 underline flex items-center gap-0.5 mt-0.5 font-semibold"
                            >
                              Ver Comprovante
                              <Link2 size={10} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Table list of transactions */}
              <div 
                className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                style={{ backgroundColor: 'var(--church-panel)' }}
              >
                {/* Header list panel containing the active search and combos filters requested in 1c */}
                <div 
                  className="px-6 py-5 border-b border-slate-102 dark:border-slate-850 space-y-4"
                  style={{ backgroundColor: 'var(--church-panel)' }}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <span className="text-[11px] uppercase font-black text-slate-400 tracking-widest block font-sans">
                      Filtros de Pesquisa & Lançamentos
                    </span>
                    <div className="flex items-center gap-3">
                      {(filterText || filterTipo !== 'Todos' || filterVencimentoOpt !== 'Hoje' || filterCategorias.length > 0 || filterFormasPagamento.length > 0 || filterCentroCusto !== '') && (
                        <button
                          onClick={() => {
                            setFilterText('');
                            setFilterTipo('Todos');
                            setFilterVencimentoOpt('Hoje');
                            setFilterVencimentoInicio('');
                            setFilterVencimentoFim('');
                            setFilterCategorias([]);
                            setFilterFormasPagamento([]);
                            setFilterCentroCusto('');
                          }}
                          className="text-[10px] text-amber-600 dark:text-amber-450 hover:underline font-bold uppercase tracking-wider flex items-center gap-1"
                        >
                          Limpar Filtros
                        </button>
                      )}
                      
                      <button
                        onClick={handlePrintReport}
                        className="flex items-center gap-1.5 bg-[#E4A232] hover:bg-[#c98e2a] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold font-sans uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                      >
                        <Printer size={13} />
                        <span>Imprimir</span>
                      </button>
                    </div>
                  </div>

                  {/* First row of filters: Search, Active Period Label, and Print Button */}
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    {/* Pesquisa de texto */}
                    <div className="relative w-full md:flex-1 max-w-lg">
                      <input
                        type="text"
                        placeholder="Pesquisar em todos os campos..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-colors h-[38px]"
                      />
                      <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                    </div>

                    {/* Active period label (Print do período) */}
                    <div className="w-full md:w-auto flex flex-wrap items-center gap-2">
                      {filterVencimentoOpt !== 'Todo Período' && (() => {
                        const now = new Date(vencimentoRefDate);
                        
                        let periodLabel = '';
                        if (filterVencimentoOpt === 'Hoje') {
                          periodLabel = now.toLocaleDateString('pt-BR');
                        } else if (filterVencimentoOpt === 'Semana') {
                          const startOfWeek = new Date(now);
                          startOfWeek.setDate(now.getDate() - now.getDay());
                          const endOfWeek = new Date(startOfWeek);
                          endOfWeek.setDate(startOfWeek.getDate() + 6);
                          periodLabel = `${startOfWeek.toLocaleDateString('pt-BR')} a ${endOfWeek.toLocaleDateString('pt-BR')}`;
                        } else if (filterVencimentoOpt === 'Mês') {
                          periodLabel = now.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
                        } else if (filterVencimentoOpt === 'Ano') {
                          periodLabel = String(now.getFullYear());
                        } else if (filterVencimentoOpt === '30 Últimos Dias') {
                          const start = new Date(now);
                          start.setDate(now.getDate() - 30);
                          periodLabel = `${start.toLocaleDateString('pt-BR')} a ${now.toLocaleDateString('pt-BR')}`;
                        } else if (filterVencimentoOpt === '12 Últimos Meses') {
                          const start = new Date(now);
                          start.setMonth(now.getMonth() - 12);
                          periodLabel = `${start.toLocaleDateString('pt-BR')} a ${now.toLocaleDateString('pt-BR')}`;
                        }

                        if (!periodLabel && filterVencimentoOpt !== 'Personalizado') return null;

                        return (
                          <div 
                            className="text-[10px] text-amber-600 dark:text-amber-450 font-black tracking-wide border border-amber-200 dark:border-amber-800/80 px-3 py-1.5 rounded-xl animate-in fade-in duration-200 shadow-sm"
                            style={{ backgroundColor: 'var(--church-panel)' }}
                          >
                            <span className="text-slate-400 font-normal uppercase tracking-wider text-[9px] mr-1">Período:</span>
                            <span>{periodLabel || 'Filtro ativo'}</span>
                          </div>
                        );
                      })()}

                      {/* Print action button */}
                      <button
                        onClick={handlePrintReport}
                        className="flex items-center gap-1.5 bg-[#E4A232] hover:bg-[#c98e2a] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold font-sans uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-sm h-[38px]"
                      >
                        <Printer size={13} />
                        <span>Imprimir Período</span>
                      </button>
                    </div>
                  </div>

                  {/* Second row of filters: Tipo, Categorias, Formas de Pagamento, Centro de Custo, and Data Vencimento combo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                    {/* f. Tipo de Transação select */}
                    <div>
                      <select
                        value={filterTipo}
                        onChange={(e) => setFilterTipo(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-colors font-semibold h-[38px]"
                      >
                        <option value="Todos">Tipo: Todos</option>
                        <option value="Entrada">Crédito (/ Entrada)</option>
                        <option value="Saída">Débito (/ Saída)</option>
                      </select>
                    </div>

                    {/* c.3 Categoria Multi-select combo dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCatDropdown(!showCatDropdown);
                          setShowFormaDropdown(false);
                          setShowCCDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none flex justify-between items-center transition-all hover:bg-slate-50 dark:hover:bg-slate-850 h-[38px]"
                      >
                        <span className="truncate">
                          {filterCategorias.length === 0 
                            ? 'Categoria: Todas' 
                            : `Categorias: (${filterCategorias.length})`
                          }
                        </span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${showCatDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showCatDropdown && (
                        <div className="absolute z-30 left-0 right-0 mt-1.5 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-52 overflow-y-auto space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                          {[
                            'Dízimo', 'Oferta', 'Doação', 'Evento', 'Aluguel', 'Água e Energia',
                            'Som e Luz', 'Manutenção', 'Missionário', 'Outros',
                            ...Array.from(new Set(transacoes.map(t => t.categoria).filter(Boolean) as string[]))
                          ].filter((v, i, self) => self.indexOf(v) === i).map((cat) => {
                            const isChecked = filterCategorias.includes(cat);
                            return (
                              <label key={cat} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-xs select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setFilterCategorias(filterCategorias.filter(c => c !== cat));
                                    } else {
                                      setFilterCategorias([...filterCategorias, cat]);
                                    }
                                  }}
                                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                                />
                                <span className="text-slate-700 dark:text-slate-200 truncate">{cat}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* c.4 Forma de Pagamento Multi-select combo dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowFormaDropdown(!showFormaDropdown);
                          setShowCatDropdown(false);
                          setShowCCDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none flex justify-between items-center transition-all hover:bg-slate-50 dark:hover:bg-slate-850 h-[38px]"
                      >
                        <span className="truncate">
                          {filterFormasPagamento.length === 0 
                            ? 'Forma Pagamento: Todas' 
                            : `Formas: (${filterFormasPagamento.length})`
                          }
                        </span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${showFormaDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showFormaDropdown && (
                        <div className="absolute z-30 left-0 right-0 mt-1.5 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-52 overflow-y-auto space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                          {[
                            'Dinheiro', 'PIX', 'Transferência', 'Cartão',
                            ...dbFormasPagamento.map(f => f.nome),
                            ...Array.from(new Set(transacoes.map(t => t.id_forma_pagamento).filter(Boolean) as string[]))
                          ].filter((v, i, self) => self.indexOf(v) === i).map((forma) => {
                            const isChecked = filterFormasPagamento.includes(forma);
                            return (
                              <label key={forma} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-xs select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setFilterFormasPagamento(filterFormasPagamento.filter(f => f !== forma));
                                    } else {
                                      setFilterFormasPagamento([...filterFormasPagamento, forma]);
                                    }
                                  }}
                                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                                />
                                <span className="text-slate-700 dark:text-slate-200 truncate">{forma}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Data Vencimento combo */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const newDate = new Date(vencimentoRefDate);
                            if (filterVencimentoOpt === 'Hoje') {
                              newDate.setDate(newDate.getDate() - 1);
                            } else if (filterVencimentoOpt === 'Semana') {
                              newDate.setDate(newDate.getDate() - 7);
                            } else if (filterVencimentoOpt === 'Mês') {
                              newDate.setMonth(newDate.getMonth() - 1);
                            } else if (filterVencimentoOpt === 'Ano') {
                              newDate.setFullYear(newDate.getFullYear() - 1);
                            } else if (filterVencimentoOpt === '30 Últimos Dias') {
                              newDate.setDate(newDate.getDate() - 30);
                            } else if (filterVencimentoOpt === '12 Últimos Meses') {
                              newDate.setMonth(newDate.getMonth() - 12);
                            } else if (filterVencimentoOpt === 'Personalizado') {
                              if (filterVencimentoInicio && filterVencimentoFim) {
                                const start = new Date(filterVencimentoInicio + 'T00:00:00');
                                const end = new Date(filterVencimentoFim + 'T00:00:00');
                                const diffTime = Math.abs(end.getTime() - start.getTime());
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                                const newStart = new Date(start);
                                newStart.setDate(start.getDate() - diffDays);
                                const newEnd = new Date(end);
                                newEnd.setDate(end.getDate() - diffDays);
                                setFilterVencimentoInicio(newStart.toISOString().split('T')[0]);
                                setFilterVencimentoFim(newEnd.toISOString().split('T')[0]);
                              }
                            }
                            setVencimentoRefDate(newDate);
                          }}
                          disabled={filterVencimentoOpt === 'Todo Período'}
                          className="px-2 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 select-none cursor-pointer hover:border-amber-500 shrink-0 transition-colors h-[38px] flex items-center justify-center"
                          title="Recuar data de vencimento"
                        >
                          <ChevronLeft size={16} />
                        </button>

                        <select
                          value={filterVencimentoOpt}
                          onChange={(e) => setFilterVencimentoOpt(e.target.value)}
                          className="flex-1 min-w-0 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-colors font-semibold h-[38px]"
                        >
                          <option value="Todo Período">Todo Período</option>
                          <option value="Hoje">Hoje</option>
                          <option value="Semana">Semana</option>
                          <option value="Mês">Mês</option>
                          <option value="Ano">Ano</option>
                          <option value="30 Últimos Dias">30 Últimos Dias</option>
                          <option value="12 Últimos Meses">12 Últimos Meses</option>
                          <option value="Personalizado">Personalizado...</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            const newDate = new Date(vencimentoRefDate);
                            if (filterVencimentoOpt === 'Hoje') {
                              newDate.setDate(newDate.getDate() + 1);
                            } else if (filterVencimentoOpt === 'Semana') {
                              newDate.setDate(newDate.getDate() + 7);
                            } else if (filterVencimentoOpt === 'Mês') {
                              newDate.setMonth(newDate.getMonth() + 1);
                            } else if (filterVencimentoOpt === 'Ano') {
                              newDate.setFullYear(newDate.getFullYear() + 1);
                            } else if (filterVencimentoOpt === '30 Últimos Dias') {
                              newDate.setDate(newDate.getDate() + 30);
                            } else if (filterVencimentoOpt === '12 Últimos Meses') {
                              newDate.setMonth(newDate.getMonth() + 12);
                            } else if (filterVencimentoOpt === 'Personalizado') {
                              if (filterVencimentoInicio && filterVencimentoFim) {
                                const start = new Date(filterVencimentoInicio + 'T00:00:00');
                                const end = new Date(filterVencimentoFim + 'T00:00:00');
                                const diffTime = Math.abs(end.getTime() - start.getTime());
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                                const newStart = new Date(start);
                                newStart.setDate(start.getDate() + diffDays);
                                const newEnd = new Date(end);
                                newEnd.setDate(end.getDate() + diffDays);
                                setFilterVencimentoInicio(newStart.toISOString().split('T')[0]);
                                setFilterVencimentoFim(newEnd.toISOString().split('T')[0]);
                              }
                            }
                            setVencimentoRefDate(newDate);
                          }}
                          disabled={filterVencimentoOpt === 'Todo Período'}
                          className="px-2 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 select-none cursor-pointer hover:border-amber-500 shrink-0 transition-colors h-[38px] flex items-center justify-center"
                          title="Avançar data de vencimento"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      {filterVencimentoOpt === 'Personalizado' && (
                        <div className="grid grid-cols-2 gap-1 mt-1 animate-in slide-in-from-top-1 duration-200">
                          <input
                            type="date"
                            value={filterVencimentoInicio}
                            onChange={(e) => setFilterVencimentoInicio(e.target.value)}
                            className="px-2 py-1 text-[10px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-amber-500"
                            placeholder="Início"
                            title="Vencimento Início"
                          />
                          <input
                            type="date"
                            value={filterVencimentoFim}
                            onChange={(e) => setFilterVencimentoFim(e.target.value)}
                            className="px-2 py-1 text-[10px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-amber-500"
                            placeholder="Fim"
                            title="Vencimento Fim"
                          />
                        </div>
                      )}
                    </div>

                    {/* Centro de Custo select filter */}
                    <div>
                      <select
                        value={filterCentroCusto}
                        onChange={(e) => setFilterCentroCusto(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-colors font-semibold h-[38px]"
                      >
                        <option value="">Centro de Custo: Todos</option>
                        {dbCentrosCusto.map(cc => (
                          <option key={cc.id} value={cc.id}>Centro: {cc.nome} ({cc.sigla})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Resumo de lançamentos filtrados */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block font-sans">
                      Resumo Financeiro dos Lançamentos Filtrados
                    </span>
                    <div className="overflow-x-auto rounded-2xl border border-slate-150 dark:border-slate-800">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest">
                            <th className="py-2.5 px-4">Tipo</th>
                            <th className="py-2.5 px-4 text-right">A Vencer</th>
                            <th className="py-2.5 px-4 text-right">Vencem hoje</th>
                            <th className="py-2.5 px-4 text-right">Vencidos</th>
                            <th className="py-2.5 px-4 text-right">Pagos</th>
                            <th className="py-2.5 px-4 text-right">Total Período</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300 font-medium">
                          {(filterTipo === 'Todos' || filterTipo === 'Entrada') && (
                            <tr className="hover:bg-emerald-500/5 transition-all font-sans border-l-4 border-l-emerald-500 bg-white/40 dark:bg-slate-900/30">
                              <td className="py-3 px-4 text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                                Crédito
                              </td>
                              <td className="py-3 px-4 text-right font-bold font-mono text-xs text-slate-705 dark:text-slate-300">
                                R$ {creditAVencer.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-right font-black font-mono text-xs text-emerald-600 dark:text-emerald-400">
                                R$ {creditHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-right font-bold font-mono text-xs text-orange-500 dark:text-orange-400">
                                R$ {creditVencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-right font-bold font-mono text-xs text-slate-500 dark:text-slate-450">
                                R$ {creditPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-right font-black font-mono text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50/10 dark:bg-emerald-955/5 rounded-r-xl">
                                R$ {creditTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          )}
                          {(filterTipo === 'Todos' || filterTipo === 'Saída') && (
                            <tr className="hover:bg-red-500/5 transition-all font-sans border-l-4 border-l-red-500 bg-white/40 dark:bg-slate-900/30">
                              <td className="py-3 px-4 text-xs font-black text-red-500 dark:text-red-400 uppercase tracking-wide">
                                Débito
                              </td>
                              <td className="py-3 px-4 text-right font-bold font-mono text-xs text-slate-705 dark:text-slate-300">
                                R$ {debitAVencer.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-right font-black font-mono text-xs text-red-500 dark:text-red-400">
                                R$ {debitHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-right font-bold font-mono text-xs text-red-600 dark:text-red-400">
                                R$ {debitVencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-right font-bold font-mono text-xs text-slate-500 dark:text-slate-450">
                                R$ {debitPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-right font-black font-mono text-xs text-red-500 dark:text-red-400 bg-red-50/10 dark:bg-red-955/5 rounded-r-xl">
                                R$ {debitTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin" />
                    Carregando histórico financeiro...
                  </div>
                ) : transacoes.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 italic">
                    Nenhuma transação financeira registrada neste caixa.
                  </div>
                ) : getFilteredTransactions().length === 0 ? (
                  <div className="p-12 text-center text-slate-500 italic">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </div>
                ) : (
                  <>
                    {selectedTransactionIds.length > 0 && (
                      <div className="mb-6 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                          <p className="text-xs font-bold text-amber-800 dark:text-amber-400">
                            {selectedTransactionIds.length} transações selecionadas para pagamento em lote
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleBatchMarkPaid}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                          >
                            Marcar como Pago em Lote
                          </button>
                          <button
                            type="button"
                            onClick={handleBatchMarkUnpaid}
                            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[11px] rounded-xl transition cursor-pointer flex items-center gap-1.5"
                          >
                            Marcar como Pendente em Lote
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedTransactionIds([])}
                            className="px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 text-[11px] font-bold cursor-pointer"
                          >
                            Cancelar Seleção
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse md:min-w-[800px] block md:table">
                      <thead className="hidden md:table-header-group">
                        <tr className="bg-slate-50/20 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 text-slate-450 text-[10px] font-black uppercase tracking-widest">
                          <th className="px-3 py-2.5 w-10 text-center">
                            <input
                              type="checkbox"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const ids = paginatedTransactions.map(t => t.id);
                                  setSelectedTransactionIds(prev => Array.from(new Set([...prev, ...ids])));
                                } else {
                                  const ids = paginatedTransactions.map(t => t.id);
                                  setSelectedTransactionIds(prev => prev.filter(id => !ids.includes(id)));
                                }
                              }}
                              checked={paginatedTransactions.length > 0 && paginatedTransactions.every(t => selectedTransactionIds.includes(t.id))}
                              className="rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500 cursor-pointer h-4 w-4"
                              title="Selecionar todos desta página"
                            />
                          </th>
                          <th className="px-3 py-2.5">Lançamento</th>
                          <th className="px-3 py-2.5 w-28 min-w-[100px]">Vencimento</th>
                          <th className="px-3 py-2.5">Categoria</th>
                          <th className="px-3 py-2.5">Cliente / Fornecedor / Canal</th>
                          <th className="px-3 py-2.5">Data Pagamento</th>
                          <th className="px-3 py-2.5">Valor</th>
                          <th className="px-3 py-2.5">Anexos</th>
                          <th className="px-3 py-2.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-355 font-medium block md:table-row-group">
                        {paginatedTransactions.map((t) => {
                          // Find client/fornecedor name
                          const associatedForn = dbFornecedores.find(f => f.id === t.id_fornecedor);

                          return (
                            <tr key={t.id} className="block md:table-row hover:bg-slate-50/30 dark:hover:bg-slate-950/5 transition-all p-4 md:p-0 space-y-2 md:space-y-0 border-b border-slate-100 dark:border-slate-850 last:border-0">
                              <td className="block md:table-cell px-3 py-1.5 md:py-2 md:w-10 text-center">
                                <div className="flex md:block items-center justify-between md:justify-center">
                                  <span className="inline-block md:hidden text-[9px] text-slate-400 font-black uppercase tracking-wider font-bold">Selecionar:</span>
                                  <input
                                    type="checkbox"
                                    checked={selectedTransactionIds.includes(t.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedTransactionIds(prev => [...prev, t.id]);
                                      } else {
                                        setSelectedTransactionIds(prev => prev.filter(id => id !== t.id));
                                      }
                                    }}
                                    className="rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500 cursor-pointer h-4 w-4"
                                  />
                                </div>
                              </td>
                              <td className="block md:table-cell px-3 py-2 md:py-2">
                                <div className="flex flex-col w-full">
                                  <span className="font-bold text-slate-900 dark:text-white text-sm">{t.descricao}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">Doc: {t.data ? new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</span>
                                </div>
                              </td>

                              <td className="block md:table-cell px-3 py-1.5 md:py-2">
                                <div className="flex md:block items-center justify-between md:justify-start">
                                  <span className="inline-block md:hidden text-[9px] text-slate-400 font-black uppercase tracking-wider">Vencimento:</span>
                                  {t.data_vencimento ? (
                                    <span className="text-black dark:text-white font-bold font-mono text-xs">{new Date(t.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                  ) : (
                                    <span className="text-black dark:text-white text-xs">-</span>
                                  )}
                                </div>
                              </td>

                              <td className="block md:table-cell px-3 py-1.5 md:py-2">
                                <div className="flex md:block items-center justify-between md:justify-start">
                                  <span className="inline-block md:hidden text-[9px] text-slate-400 font-black uppercase tracking-wider">Categoria:</span>
                                  <span className={`text-[10px] font-black uppercase tracking-widest bg-transparent ${
                                    t.tipo === 'Entrada'
                                      ? 'text-blue-600 dark:text-blue-450'
                                      : 'text-red-500 dark:text-red-400'
                                  }`}>
                                    {t.categoria}
                                  </span>
                                </div>
                              </td>

                              <td className="block md:table-cell px-3 py-1.5 md:py-2">
                                <div className="flex md:block items-center justify-between md:justify-start">
                                  <span className="inline-block md:hidden text-[9px] text-slate-400 font-black uppercase tracking-wider">Origem/Destino:</span>
                                  {associatedForn ? (
                                    <span className="text-black dark:text-white font-bold text-xs">{associatedForn.razao_social}</span>
                                  ) : (
                                    <span className="text-black dark:text-white font-bold text-xs">{t.membro_contribuinte || 'Coletivo / Caixa'}</span>
                                  )}
                                </div>
                              </td>

                              <td className="block md:table-cell px-3 py-1.5 md:py-2">
                                <div className="flex md:block items-center justify-between md:justify-start">
                                  <span className="inline-block md:hidden text-[9px] text-slate-400 font-black uppercase tracking-wider">Pagamento:</span>
                                  {t.data_pagamento ? (
                                    <span className="text-black dark:text-black font-bold font-mono text-xs">{new Date(t.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                  ) : (
                                    <span className="text-red-500 dark:text-red-450 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5 bg-red-50 dark:bg-red-950/30 rounded border border-red-100 dark:border-red-900/30">Pendente</span>
                                  )}
                                </div>
                              </td>

                              <td className="block md:table-cell px-3 py-1.5 md:py-2">
                                <div className="flex md:block items-center justify-between md:justify-start">
                                  <span className="inline-block md:hidden text-[9px] text-slate-400 font-black uppercase tracking-wider">Valor:</span>
                                  <span className={`font-black text-sm whitespace-nowrap ${
                                    t.tipo === 'Entrada' ? 'text-blue-600 dark:text-blue-450' : 'text-red-500'
                                  }`}>
                                    {t.tipo === 'Entrada' ? '+' : '-'} R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </td>

                              <td className="block md:table-cell px-3 py-1.5 md:py-2">
                                <div className="flex md:block items-center justify-between md:justify-start">
                                  <span className="inline-block md:hidden text-[9px] text-slate-400 font-black uppercase tracking-wider">Anexos:</span>
                                  {t.arquivos_transacao && t.arquivos_transacao.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => loadAttachmentsForTransacao(t.id)}
                                      className="text-black dark:text-white hover:text-slate-700 dark:hover:text-slate-300 font-bold text-xs uppercase flex items-center gap-1 hover:underline cursor-pointer"
                                    >
                                      <File size={14} className="text-black dark:text-white" />
                                      <span>Ver</span>
                                    </button>
                                  ) : (
                                    <span className="text-slate-400 text-xs">-</span>
                                  )}
                                </div>
                              </td>

                              <td 
                                className="block md:table-cell px-3 py-2.5 md:py-2 text-right border-t md:border-t-0 border-slate-100 dark:border-slate-800 md:bg-transparent -mx-6 md:mx-0 px-6 mt-2 rounded-b-2xl"
                                style={{ backgroundColor: 'var(--church-panel)' }}
                              >
                                <div className="flex justify-between md:justify-end items-center gap-1.5">
                                  <span className="inline-block md:hidden text-[9px] text-slate-450 font-black uppercase tracking-wider font-bold">Ações:</span>
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => handleEdit(t)}
                                      className="p-1.5 text-slate-400 hover:text-amber-650 hover:bg-white dark:hover:bg-slate-800 transition rounded-lg cursor-pointer flex items-center gap-1"
                                      title="Editar Lançamento"
                                    >
                                      <Tag size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleClone(t)}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 transition rounded-lg cursor-pointer flex items-center gap-1"
                                      title="Clonar Lançamento"
                                    >
                                      <Copy size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(t.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-white dark:hover:bg-slate-800 transition rounded-lg cursor-pointer flex items-center gap-1"
                                      title="Excluir Lançamento"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="px-6 py-4 bg-slate-50/30 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-850 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span>Exibindo</span>
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs outline-none focus:border-amber-500 transition-colors font-bold cursor-pointer"
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span>registros de um total de <strong>{totalRecords}</strong></span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={activePage === 1}
                        className="p-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-semibold select-none cursor-pointer text-slate-700 dark:text-slate-300 transition-all"
                      >
                        Primeira
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={activePage === 1}
                        className="p-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-semibold select-none cursor-pointer text-slate-700 dark:text-slate-300 transition-all"
                      >
                        Anterior
                      </button>
                      <span className="text-xs text-slate-500 font-bold px-3">
                        Página {activePage} de {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={activePage === totalPages}
                        className="p-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-semibold select-none cursor-pointer text-slate-700 dark:text-slate-300 transition-all"
                      >
                        Próxima
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={activePage === totalPages}
                        className="p-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-semibold select-none cursor-pointer text-slate-700 dark:text-slate-300 transition-all"
                      >
                        Última
                      </button>
                    </div>
                  </div>
                </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* CONTAS SUBMODULE TAB */}
      {activeTab === 'contas' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Landmark className="text-amber-500" />
                Gerenciamento de Contas Bancárias
              </h3>
              <p className="text-xs text-slate-500 mt-1">Configure bancos, agências e contas para controle de saldos</p>
            </div>
            {!editingConta && (
              <button
                onClick={() => setEditingConta({ nome: '', banco: '', agencia: '', conta_corrente: '' })}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition"
              >
                Cadastrar Conta
              </button>
            )}
          </div>

          {editingConta && (
            <form onSubmit={handleSaveConta} className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-75Q space-y-4 animate-in slide-in-from-top-4 duration-200">
              <h4 className="text-xs font-black uppercase text-amber-500">{editingConta.id ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome Identificador *</label>
                  <input
                    type="text"
                    required
                    value={editingConta.nome || ''}
                    onChange={(e) => setEditingConta({...editingConta, nome: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                    placeholder="Ex: Conta BB Principal"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Instituição de Banco</label>
                  <input
                    type="text"
                    value={editingConta.banco || ''}
                    onChange={(e) => setEditingConta({...editingConta, banco: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    placeholder="Ex: Banco do Brasil"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Agência</label>
                  <input
                    type="text"
                    value={editingConta.agencia || ''}
                    onChange={(e) => setEditingConta({...editingConta, agencia: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    placeholder="Ex: 1234-5"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Conta Corrente</label>
                  <input
                    type="text"
                    value={editingConta.conta_corrente || ''}
                    onChange={(e) => setEditingConta({...editingConta, conta_corrente: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    placeholder="Ex: 98765-4"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingConta(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-bold hover:bg-slate-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded"
                >
                  Confirmar Salvar
                </button>
              </div>
            </form>
          )}

          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-4">Nome da Conta</th>
                  <th className="p-4">Banco</th>
                  <th className="p-4">Agência</th>
                  <th className="p-4">Nº Conta Corrente</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {dbContas.map((conta) => (
                  <tr key={conta.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{conta.nome}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{conta.banco || '-'}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 font-mono">{conta.agencia || '-'}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 font-mono">{conta.conta_corrente || '-'}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingConta(conta)}
                          className="p-1 text-slate-400 hover:text-amber-500 rounded"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteConta(conta.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {dbContas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">Nenhuma conta bancária cadastrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CATEGORIAS SUBMODULE TAB */}
      {activeTab === 'categorias' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="text-amber-500" />
                Gerenciamento de Categorias de Entrada/Saída
              </h3>
              <p className="text-xs text-slate-500 mt-1">Organize seu plano de contas classificando receitas (Créditos) e despesas (Débitos)</p>
            </div>
            {!editingCategoria && (
              <button
                onClick={() => setEditingCategoria({ nome: '', tipo: 'Crédito' })}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition"
              >
                Cadastrar Categoria
              </button>
            )}
          </div>

          {editingCategoria && (
            <form onSubmit={handleSaveCategoria} className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-750 max-w-xl space-y-4 animate-in slide-in-from-top-4 duration-200">
              <h4 className="text-xs font-black uppercase text-amber-500">{editingCategoria.id ? 'Editar Categoria' : 'Nova Categoria'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome da Categoria *</label>
                  <input
                    type="text"
                    required
                    value={editingCategoria.nome || ''}
                    onChange={(e) => setEditingCategoria({...editingCategoria, nome: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                    placeholder="Ex: Fornecedores Som"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo de Aplicação *</label>
                  <select
                    value={editingCategoria.tipo || 'Crédito'}
                    onChange={(e) => setEditingCategoria({...editingCategoria, tipo: e.target.value as any})}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="Crédito">Crédito (Entradas)</option>
                    <option value="Débito">Débito (Saídas)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCategoria(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-bold hover:bg-slate-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded"
                >
                  Salvar Categoria
                </button>
              </div>
            </form>
          )}

          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-4">Nome da Categoria</th>
                  <th className="p-4">Tipo (Fluxo)</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {dbCategorias.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{cat.nome}</td>
                    <td className="p-4">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        cat.tipo === 'Crédito'
                          ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
                      }`}>
                        {cat.tipo === 'Crédito' ? 'Crédito (Entrada)' : 'Débito (Saída)'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingCategoria(cat)}
                          className="p-1 text-slate-400 hover:text-amber-500 rounded"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategoria(cat.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {dbCategorias.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-400 italic">Nenhuma categoria cadastrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FORMAS DE PAGAMENTO SUBMODULE TAB */}
      {activeTab === 'formas_pagamento' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="text-amber-500" />
                Gerenciamento de Formas de Pagamento
              </h3>
              <p className="text-xs text-slate-500 mt-1">Cadastre formas de entrada e saída financeira (ex: PIX, Dinheiro, Transferência, Boleto...)</p>
            </div>
            {!editingForma && (
              <button
                onClick={() => setEditingForma({ nome: '' })}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition"
              >
                Cadastrar Forma de Pagamento
              </button>
            )}
          </div>

          {editingForma && (
            <form onSubmit={handleSaveForma} className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-750 max-w-md space-y-4 animate-in slide-in-from-top-4 duration-200">
              <h4 className="text-xs font-black uppercase text-amber-500">{editingForma.id ? 'Editar Forma Pagamento' : 'Nova Forma Pagamento'}</h4>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome Descritivo *</label>
                <input
                  type="text"
                  required
                  value={editingForma.nome || ''}
                  onChange={(e) => setEditingForma({...editingForma, nome: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-905 dark:text-white font-bold"
                  placeholder="Ex: Cartão de Débito"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingForma(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-bold hover:bg-slate-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded"
                >
                  Salvar
                </button>
              </div>
            </form>
          )}

          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-4">Descrição da Forma de Pagamento</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {dbFormasPagamento.map((forma) => (
                  <tr key={forma.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{forma.nome}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingForma(forma)}
                          className="p-1 text-slate-400 hover:text-amber-500 rounded"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteForma(forma.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {dbFormasPagamento.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-slate-400 italic">Nenhuma forma de pagamento cadastrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CENTRO DE CUSTO SUBMODULE TAB */}
      {activeTab === 'centro_custo' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="text-amber-500" />
                Gerenciamento de Centros de Custo
              </h3>
              <p className="text-xs text-slate-500 mt-1">Cadastre centros de custo para agrupar e organizar seus lançamentos (ex: Ministério de Louvor, Administrativo, Missões...)</p>
            </div>
            {!editingCentroCusto && (
              <button
                onClick={() => setEditingCentroCusto({ nome: '', sigla: '' })}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition"
              >
                Cadastrar Centro de Custo
              </button>
            )}
          </div>

          {editingCentroCusto && (
            <form onSubmit={handleSaveCentroCusto} className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-750 max-w-md space-y-4 animate-in slide-in-from-top-4 duration-200">
              <h4 className="text-xs font-black uppercase text-amber-500">{editingCentroCusto.id ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}</h4>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome do Centro de Custo *</label>
                <input
                  type="text"
                  required
                  value={editingCentroCusto.nome || ''}
                  onChange={(e) => setEditingCentroCusto({...editingCentroCusto, nome: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                  placeholder="Ex: Departamento Infantil"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sigla / Abreviação *</label>
                <input
                  type="text"
                  required
                  value={editingCentroCusto.sigla || ''}
                  onChange={(e) => setEditingCentroCusto({...editingCentroCusto, sigla: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                  placeholder="Ex: DEP-INF"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCentroCusto(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-bold hover:bg-slate-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded"
                >
                  Salvar
                </button>
              </div>
            </form>
          )}

          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-4">Nome do Centro de Custo</th>
                  <th className="p-4">Sigla</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {dbCentrosCusto.map((cc) => (
                  <tr key={cc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{cc.nome}</td>
                    <td className="p-4 font-bold text-slate-500 dark:text-slate-400">{cc.sigla}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingCentroCusto(cc)}
                          className="p-1 text-slate-400 hover:text-amber-500 rounded"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCentroCusto(cc.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {dbCentrosCusto.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-400 italic">Nenhum centro de custo cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FLUXO DE CAIXA SUBMODULE TAB */}
      {activeTab === 'fluxo_caixa' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Header section with description */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-black font-headline uppercase tracking-tight text-slate-900 dark:text-white">
                Submódulo de Fluxo de Caixa
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                Acompanhe o desempenho de entradas e saídas consolidadas por período e centro de custo.
              </p>
            </div>
            {/* Clear filters shortcut for cash flow */}
            {(fluxoPeriodoOpt !== 'Todo Período' || fluxoCentroCusto !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFluxoPeriodoOpt('Todo Período');
                  setFluxoCentroCusto('');
                  setFluxoPeriodoInicio('');
                  setFluxoPeriodoFim('');
                }}
                className="text-[10px] text-amber-600 dark:text-amber-450 hover:underline font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                Limpar Filtros do Fluxo
              </button>
            )}
          </div>

          {/* Filters panel inside Fluxo de Caixa */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Filtros do Fluxo de Caixa</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* Centro de Custo Filter */}
              <div>
                <label className="block text-[10px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Filtrar por Centro de Custo
                </label>
                <select
                  value={fluxoCentroCusto}
                  onChange={(e) => setFluxoCentroCusto(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-colors font-semibold h-[38px] cursor-pointer"
                >
                  <option value="">Todos os Centros de Custo</option>
                  {dbCentrosCusto.map(cc => (
                    <option key={cc.id} value={cc.id}>{cc.nome} ({cc.sigla})</option>
                  ))}
                </select>
              </div>

              {/* Period Filter (Vencimento combo) */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest ml-1">
                  Filtrar por Período (Vencimento)
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const newDate = new Date(fluxoRefDate);
                      if (fluxoPeriodoOpt === 'Hoje') {
                        newDate.setDate(newDate.getDate() - 1);
                      } else if (fluxoPeriodoOpt === 'Semana') {
                        newDate.setDate(newDate.getDate() - 7);
                      } else if (fluxoPeriodoOpt === 'Mês') {
                        newDate.setMonth(newDate.getMonth() - 1);
                      } else if (fluxoPeriodoOpt === 'Ano') {
                        newDate.setFullYear(newDate.getFullYear() - 1);
                      } else if (fluxoPeriodoOpt === '30 Últimos Dias') {
                        newDate.setDate(newDate.getDate() - 30);
                      } else if (fluxoPeriodoOpt === '12 Últimos Meses') {
                        newDate.setMonth(newDate.getMonth() - 12);
                      } else if (fluxoPeriodoOpt === 'Personalizado') {
                        if (fluxoPeriodoInicio && fluxoPeriodoFim) {
                          const start = new Date(fluxoPeriodoInicio + 'T00:00:00');
                          const end = new Date(fluxoPeriodoFim + 'T00:00:00');
                          const diffTime = Math.abs(end.getTime() - start.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                          const newStart = new Date(start);
                          newStart.setDate(start.getDate() - diffDays);
                          const newEnd = new Date(end);
                          newEnd.setDate(end.getDate() - diffDays);
                          setFluxoPeriodoInicio(newStart.toISOString().split('T')[0]);
                          setFluxoPeriodoFim(newEnd.toISOString().split('T')[0]);
                        }
                      }
                      setFluxoRefDate(newDate);
                    }}
                    disabled={fluxoPeriodoOpt === 'Todo Período'}
                    className="px-2 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 select-none cursor-pointer hover:border-amber-500 shrink-0 transition-colors h-[38px] flex items-center justify-center"
                    title="Recuar período"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <select
                    value={fluxoPeriodoOpt}
                    onChange={(e) => setFluxoPeriodoOpt(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-colors font-semibold h-[38px] cursor-pointer"
                  >
                    <option value="Todo Período">Todo Período</option>
                    <option value="Hoje">Hoje</option>
                    <option value="Semana">Semana</option>
                    <option value="Mês">Mês</option>
                    <option value="Ano">Ano</option>
                    <option value="30 Últimos Dias">30 Últimos Dias</option>
                    <option value="12 Últimos Meses">12 Últimos Meses</option>
                    <option value="Personalizado">Personalizado...</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const newDate = new Date(fluxoRefDate);
                      if (fluxoPeriodoOpt === 'Hoje') {
                        newDate.setDate(newDate.getDate() + 1);
                      } else if (fluxoPeriodoOpt === 'Semana') {
                        newDate.setDate(newDate.getDate() + 7);
                      } else if (fluxoPeriodoOpt === 'Mês') {
                        newDate.setMonth(newDate.getMonth() + 1);
                      } else if (fluxoPeriodoOpt === 'Ano') {
                        newDate.setFullYear(newDate.getFullYear() + 1);
                      } else if (fluxoPeriodoOpt === '30 Últimos Dias') {
                        newDate.setDate(newDate.getDate() + 30);
                      } else if (fluxoPeriodoOpt === '12 Últimos Meses') {
                        newDate.setMonth(newDate.getMonth() + 12);
                      } else if (fluxoPeriodoOpt === 'Personalizado') {
                        if (fluxoPeriodoInicio && fluxoPeriodoFim) {
                          const start = new Date(fluxoPeriodoInicio + 'T00:00:00');
                          const end = new Date(fluxoPeriodoFim + 'T00:00:00');
                          const diffTime = Math.abs(end.getTime() - start.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                          const newStart = new Date(start);
                          newStart.setDate(start.getDate() + diffDays);
                          const newEnd = new Date(end);
                          newEnd.setDate(end.getDate() + diffDays);
                          setFluxoPeriodoInicio(newStart.toISOString().split('T')[0]);
                          setFluxoPeriodoFim(newEnd.toISOString().split('T')[0]);
                        }
                      }
                      setFluxoRefDate(newDate);
                    }}
                    disabled={fluxoPeriodoOpt === 'Todo Período'}
                    className="px-2 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 select-none cursor-pointer hover:border-amber-500 shrink-0 transition-colors h-[38px] flex items-center justify-center"
                    title="Avançar período"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Active Period Display */}
              <div className="flex items-center">
                {fluxoPeriodoOpt !== 'Todo Período' && (() => {
                  const now = new Date(fluxoRefDate);
                  let periodLabel = '';
                  if (fluxoPeriodoOpt === 'Hoje') {
                    periodLabel = now.toLocaleDateString('pt-BR');
                  } else if (fluxoPeriodoOpt === 'Semana') {
                    const startOfWeek = new Date(now);
                    startOfWeek.setDate(now.getDate() - now.getDay());
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                    periodLabel = `${startOfWeek.toLocaleDateString('pt-BR')} a ${endOfWeek.toLocaleDateString('pt-BR')}`;
                  } else if (fluxoPeriodoOpt === 'Mês') {
                    periodLabel = now.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
                  } else if (fluxoPeriodoOpt === 'Ano') {
                    periodLabel = String(now.getFullYear());
                  } else if (fluxoPeriodoOpt === '30 Últimos Dias') {
                    const start = new Date(now);
                    start.setDate(now.getDate() - 30);
                    periodLabel = `${start.toLocaleDateString('pt-BR')} a ${now.toLocaleDateString('pt-BR')}`;
                  } else if (fluxoPeriodoOpt === '12 Últimos Meses') {
                    const start = new Date(now);
                    start.setMonth(now.getMonth() - 12);
                    periodLabel = `${start.toLocaleDateString('pt-BR')} a ${now.toLocaleDateString('pt-BR')}`;
                  }

                  if (!periodLabel && fluxoPeriodoOpt !== 'Personalizado') return null;

                  return (
                    <div 
                      className="text-[10px] text-amber-600 dark:text-amber-450 font-black tracking-wide border border-amber-200 dark:border-amber-800/80 px-4 py-2.5 rounded-xl w-full text-center shadow-sm"
                      style={{ backgroundColor: 'var(--church-panel)' }}
                    >
                      <span className="text-slate-400 font-normal uppercase tracking-wider text-[9px] mr-1">Periodo Ativo:</span>
                      <span>{periodLabel || 'Filtro personalizado ativo'}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Custom dates input */}
            {fluxoPeriodoOpt === 'Personalizado' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-1 duration-200">
                <div>
                  <label className="block text-[10px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest mb-1 ml-1">Data Início</label>
                  <input
                    type="date"
                    value={fluxoPeriodoInicio}
                    onChange={(e) => setFluxoPeriodoInicio(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-black dark:text-white cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest mb-1 ml-1">Data Fim</label>
                  <input
                    type="date"
                    value={fluxoPeriodoFim}
                    onChange={(e) => setFluxoPeriodoFim(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-black dark:text-white cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bento-grid of balances using filtered values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Receitas</span>
                <p className="text-3xl font-black text-black dark:text-white">R$ {fluxoTotalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-12 h-12 bg-transparent text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Despesas</span>
                <p className="text-3xl font-black text-black dark:text-white">R$ {fluxoTotalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-12 h-12 bg-transparent text-red-500 dark:text-red-400 rounded-2xl flex items-center justify-center">
                <TrendingDown size={24} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Saldo Consolidado</span>
                <p className="text-3xl font-black text-black dark:text-white">R$ {fluxoSaldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-12 h-12 bg-transparent text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                <Wallet size={24} />
              </div>
            </div>
          </div>

          {/* Charts view using filtered values */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 font-headline">Fluxo Diário / Histórico Próximo</h4>
            {fluxoChartData.length > 0 ? (
              <div className="h-64 w-full">
                <FinancialChart chartData={fluxoChartData} />
              </div>
            ) : (
              <div className="h-64 w-full flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">Sem dados suficientes para exibição</div>
            )}
          </div>
        </div>
      )}

      {/* FINANCE REPORTS SUBMODULE TAB */}
      {activeTab === 'relatorios' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Header section of sub-module */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-xl font-black font-headline uppercase tracking-tight text-slate-900 dark:text-white">
              Submódulo de Relatórios Financeiros
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Selecione o filtro por período baseado na <strong>data de vencimento</strong> dos lançamentos e baixe os documentos oficiais formatados como os outros relatórios já prontos da igreja.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Filters panel (1/3 of the screen width on large devices) */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm h-fit space-y-6">
              <div>
                <h4 className="text-xs font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest mb-4">
                  Filtro por Período de Vencimento
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                      Data Inicial (Vencimento)
                    </label>
                    <input
                      type="date"
                      value={reportDateInicio}
                      onChange={(e) => setReportDateInicio(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-black dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                      Data Final (Vencimento)
                    </label>
                    <input
                      type="date"
                      value={reportDateFim}
                      onChange={(e) => setReportDateFim(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-black dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                      Centro de Custo
                    </label>
                    <select
                      value={reportCentroCusto}
                      onChange={(e) => setReportCentroCusto(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-black dark:text-white font-semibold"
                    >
                      <option value="">Todos os Centros de Custo</option>
                      {dbCentrosCusto.map(cc => (
                        <option key={cc.id} value={cc.id}>{cc.nome} ({cc.sigla})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                <span className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  Atalhos Rápidos
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      setReportDateInicio(todayStr);
                      setReportDateFim(todayStr);
                    }}
                    className="px-3 py-2.5 text-xs font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 border-2 border-slate-205 dark:border-slate-700 hover:border-amber-500 rounded-xl text-slate-850 dark:text-slate-200 transition-all text-center cursor-pointer shadow-sm"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const startOfWeek = new Date(now);
                      startOfWeek.setDate(now.getDate() - now.getDay());
                      const endOfWeek = new Date(startOfWeek);
                      endOfWeek.setDate(startOfWeek.getDate() + 6);
                      setReportDateInicio(startOfWeek.toISOString().split('T')[0]);
                      setReportDateFim(endOfWeek.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-2.5 text-xs font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 border-2 border-slate-205 dark:border-slate-700 hover:border-amber-500 rounded-xl text-slate-850 dark:text-slate-200 transition-all text-center cursor-pointer shadow-sm"
                  >
                    Esta Semana
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                      setReportDateInicio(startOfMonth.toISOString().split('T')[0]);
                      setReportDateFim(endOfMonth.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-2.5 text-xs font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-805 border-2 border-slate-205 dark:border-slate-700 hover:border-amber-500 rounded-xl text-slate-850 dark:text-slate-200 transition-all text-center cursor-pointer shadow-sm"
                  >
                    Este Mês
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReportDateInicio('');
                      setReportDateFim('');
                    }}
                    className="px-3 py-2.5 text-xs font-black bg-amber-600 hover:bg-amber-700 rounded-xl text-white transition text-center col-span-2 cursor-pointer shadow-sm"
                  >
                    Limpar Período (Tudo)
                  </button>
                </div>
              </div>
            </div>

            {/* Reports Cards Grid (2/3 of the screen width on large devices) */}
            <div className="lg:col-span-2 space-y-6">
              <h4 className="text-xs font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest pl-1">
                Selecione um dos 3 Relatórios
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1) Accounts Payable */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-transparent text-red-655 dark:text-red-400 rounded-2xl flex items-center justify-center">
                        <TrendingDown size={20} />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                          1) Contas a Pagar
                        </h5>
                        <p className="text-[9px] text-slate-450 uppercase tracking-widest font-black">
                          Débitos / Despesas
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed pt-1">
                      Relaciona unicamente os lançamentos de débito com vencimento no período especificado de forma cronológica. Exibe as colunas Vencimento, Descrição, Categoria, Fornecedor, Valor e saldo acumulado.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGenerateFinanceReport('contas_pagar')}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-2xl text-xs transition shadow-sm cursor-pointer"
                  >
                    <Printer size={15} />
                    Imprimir Contas a Pagar
                  </button>
                </div>

                {/* 2) Accounts Receivable */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-transparent text-green-655 dark:text-green-400 rounded-2xl flex items-center justify-center">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                          2) Contas a Receber
                        </h5>
                        <p className="text-[9px] text-slate-450 uppercase tracking-widest font-black">
                          Créditos / Receitas
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed pt-1">
                      Relaciona unicamente os lançamentos de crédito com vencimento no período especificado de forma cronológica. Exibe as colunas Vencimento, Descrição, Categoria, Cliente / Contribuinte, Valor e saldo acumulado.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGenerateFinanceReport('contas_receber')}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-2xl text-xs transition shadow-sm cursor-pointer"
                  >
                    <Printer size={15} />
                    Imprimir Contas a Receber
                  </button>
                </div>

                {/* 3) Consolidated Cash Flow */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition space-y-4 md:col-span-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-transparent text-amber-600 dark:text-amber-450 rounded-2xl flex items-center justify-center">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                          3) Fluxo de Caixa Consolidado
                        </h5>
                        <p className="text-[9px] text-slate-450 uppercase tracking-widest font-black">
                          DRE / Consolidado Geral
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed pt-1">
                      Combina ambos lançamentos de crédito e de débito de forma cronológica. Inclui demonstrativos e somas consolidadas das receitas totais contrabalançadas pelos custos, extraindo o saldo líquido final da igreja.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGenerateFinanceReport('fluxo_caixa')}
                    className="w-full mt-2 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 px-4 rounded-2xl text-xs transition shadow-sm cursor-pointer"
                  >
                    <Printer size={15} />
                    Compilar Relatório de Fluxo Consolidado
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick preview grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Visualização Prévia dos Registros Selecionados
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registros que farão parte do relatório no período de vencimento selecionado.
                </p>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedReportType('contas_pagar')}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                    selectedReportType === 'contas_pagar'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Contas a Pagar
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReportType('contas_receber')}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                    selectedReportType === 'contas_receber'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Contas a Receber
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReportType('fluxo_caixa')}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                    selectedReportType === 'fluxo_caixa'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Consolidado
                </button>
              </div>
            </div>

            {(() => {
              // local filtering computation for preview
              let prevList = [...transacoes];
              if (reportDateInicio) {
                prevList = prevList.filter(t => t.data_vencimento && t.data_vencimento >= reportDateInicio);
              }
              if (reportDateFim) {
                prevList = prevList.filter(t => t.data_vencimento && t.data_vencimento <= reportDateFim);
              }
              if (reportCentroCusto) {
                prevList = prevList.filter(t => t.id_centro_custo === reportCentroCusto);
              }
              if (selectedReportType === 'contas_pagar') {
                prevList = prevList.filter(t => t.tipo === 'Saída');
              } else if (selectedReportType === 'contas_receber') {
                prevList = prevList.filter(t => t.tipo === 'Entrada');
              }
              
              prevList.sort((a,b) => {
                if (!a.data_vencimento && !b.data_vencimento) return 0;
                if (!a.data_vencimento) return 1;
                if (!b.data_vencimento) return -1;
                return a.data_vencimento.localeCompare(b.data_vencimento);
              });

              const printSum = prevList.reduce((acc, current) => {
                if (selectedReportType === 'fluxo_caixa') {
                  return acc + (current.tipo === 'Entrada' ? current.valor : -current.valor);
                }
                return acc + current.valor;
              }, 0);

              if (prevList.length === 0) {
                return (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 text-xs uppercase tracking-widest font-black py-12">
                    Nenhum registro correspondente no período de vencimento selecionado.
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-2xl border border-slate-150 dark:border-slate-800">
                    <table className="w-full text-left text-xs bg-slate-50/50 dark:bg-slate-950/35">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-850 text-slate-800 dark:text-slate-200 uppercase font-black text-[9px] tracking-widest border-b border-slate-150 dark:border-slate-800">
                          <th className="p-4">Vencimento</th>
                          <th className="p-4">Descrição / Doc</th>
                          <th className="p-4">Categoria</th>
                          <th className="p-4">
                            {selectedReportType === 'contas_pagar'
                              ? 'Fornecedor'
                              : selectedReportType === 'contas_receber'
                                ? 'Cliente'
                                : 'Cliente / Fornecedor'}
                          </th>
                          {selectedReportType === 'fluxo_caixa' && <th className="p-4">Tipo</th>}
                          <th className="p-4 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prevList.map((t) => {
                          const contactName = dbFornecedores.find(f => f.id === t.id_fornecedor)?.razao_social || t.membro_contribuinte || 'Coletivo / Caixa';
                          return (
                            <tr
                              key={t.id}
                              className="border-b border-slate-150 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition"
                            >
                              <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                                {t.data_vencimento ? new Date(t.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                              </td>
                              <td className="p-4 text-slate-700 dark:text-slate-300">
                                <span className="font-bold">{t.descricao}</span>
                                <span className="block text-[10px] text-slate-405 mt-0.5">
                                  Doc: {t.data ? new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className="px-2 py-0.5 rounded-md bg-slate-250 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[9px]">
                                  {t.categoria}
                                </span>
                              </td>
                              <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                                {contactName}
                              </td>
                              {selectedReportType === 'fluxo_caixa' && (
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase ${
                                    t.tipo === 'Entrada'
                                      ? 'bg-green-100 dark:bg-green-950/45 text-green-705 dark:text-green-400'
                                      : 'bg-red-100 dark:bg-red-950/45 text-red-705 dark:text-red-400'
                                  }`}>
                                    {t.tipo === 'Entrada' ? 'Crédito' : 'Débito'}
                                  </span>
                                </td>
                              )}
                              <td className={`p-4 text-right font-mono font-bold text-sm ${
                                t.tipo === 'Entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                              }`}>
                                {t.tipo === 'Entrada' ? '+' : '-'} R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary row */}
                  <div className="flex justify-end p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-800">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs uppercase font-black tracking-widest text-slate-450">
                        {selectedReportType === 'fluxo_caixa'
                          ? 'Saldo Líquido Previsto:'
                          : 'Soma Total Prevista:'}
                      </span>
                      <span className={`text-xl font-mono font-black ${
                        selectedReportType === 'fluxo_caixa' 
                          ? (printSum >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500' )
                          : 'text-slate-900 dark:text-white'
                      }`}>
                        R$ {printSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* STATISTICS SUBMODULE TAB */}
      {activeTab === 'estatisticas_financeiras' && (() => {
        // Filter transactions for statistics
        const statsFilteredTransacoes = transacoes.filter(t => {
          if (!t.data) return false;
          return t.data >= statsDateInicio && t.data <= statsDateFim;
        });

        // Calculate totals
        const statsTotalEntradas = statsFilteredTransacoes
          .filter(t => t.tipo === 'Entrada')
          .reduce((sum, t) => sum + t.valor, 0);

        const statsTotalSaidas = statsFilteredTransacoes
          .filter(t => t.tipo === 'Saída')
          .reduce((sum, t) => sum + t.valor, 0);

        const statsSaldoConsolidado = statsTotalEntradas - statsTotalSaidas;

        // Build chart data
        const statsDataMap: Record<string, { Entrada: number; Saída: number }> = {};
        statsFilteredTransacoes.forEach(t => {
          // Format as DD/MM
          const d = t.data ? t.data.substring(8, 10) + '/' + t.data.substring(5, 7) : 'Geral';
          if (!statsDataMap[d]) {
            statsDataMap[d] = { Entrada: 0, Saída: 0 };
          }
          statsDataMap[d][t.tipo] += t.valor;
        });

        const statsChartData = Object.entries(statsDataMap)
          .map(([data, values]) => ({
            data,
            ...values,
          }))
          .sort((a, b) => {
            // Sort DD/MM chronologically
            const [dayA, monthA] = a.data.split('/').map(Number);
            const [dayB, monthB] = b.data.split('/').map(Number);
            if (monthA !== monthB) return monthA - monthB;
            return dayA - dayB;
          })
          .slice(-15); // Get latest 15 active days for cleaner bar chart layout

        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header section of sub-module */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-xl font-black font-headline uppercase tracking-tight text-slate-900 dark:text-white">
                  Estatísticas Financeiras
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  Visualize o gráfico comparativo de receitas (entradas) e despesas (saídas) com filtros de período personalizados.
                </p>
              </div>

              {/* Date Filters inside Header */}
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">
                    De:
                  </label>
                  <input
                    type="date"
                    value={statsDateInicio}
                    onChange={(e) => setStatsDateInicio(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-black dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">
                    Até:
                  </label>
                  <input
                    type="date"
                    value={statsDateFim}
                    onChange={(e) => setStatsDateFim(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-black dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total de Receitas (Entradas)</span>
                  <p className="text-2xl font-black font-headline text-green-600 dark:text-green-400">
                    R$ {statsTotalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-2xl">
                  <TrendingUp size={24} />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total de Despesas (Saídas)</span>
                  <p className="text-2xl font-black font-headline text-red-500">
                    R$ {statsTotalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-2xl">
                  <TrendingDown size={24} />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo Consolidado</span>
                  <p className={`text-2xl font-black font-headline ${statsSaldoConsolidado >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    R$ {statsSaldoConsolidado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className={`p-3 rounded-2xl ${statsSaldoConsolidado >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/30 text-red-500'}`}>
                  <Wallet size={24} />
                </div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-850 dark:text-white flex items-center gap-2">
                  <TrendingUp size={16} className="text-amber-500" />
                  Gráfico Comparativo de Entradas vs Saídas
                </h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                  Período Filtrado
                </span>
              </div>
              
              {statsChartData.length > 0 ? (
                <div className="h-80 w-full">
                  <FinancialChart chartData={statsChartData} />
                </div>
              ) : (
                <div className="h-80 w-full flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                  Sem dados para o período selecionado
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
