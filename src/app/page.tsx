'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  Download, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Phone, 
  Mail, 
  Calendar, 
  Plus, 
  MapPin, 
  Bookmark, 
  QrCode, 
  UserPlus, 
  ShieldCheck, 
  FileText,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Home
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface Member {
  id: string;
  id_igreja: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  status: string;
  batizado_aguas: boolean;
  batizado_espirito: boolean;
  cargo: string;
  foto_url: string | null;
  created_at: string;
}

interface Church {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  logo_url: string | null;
  slug: string;
  ativo: boolean;
  cor_fundo: string;
  cor_paineis: string;
  cor_bordas: string;
  cor_fontes: string;
  cor_botoes: string;
  idioma_padrao: string;
}

export default function ChurchDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [church, setChurch] = useState<Church | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [officeFilter, setOfficeFilter] = useState<string>('All');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Fetch church config
        const churchRes = await fetch('/api/igreja');
        if (churchRes.ok) {
          const churchData = await churchRes.json();
          setChurch(churchData);
        }

        // Fetch members
        const membersRes = await fetch('/api/membros');
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData);
          if (membersData.length > 0) {
            setSelectedMember(membersData[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        showToast('Erro ao carregar dados do servidor.', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const offices = ['All', ...Array.from(new Set(members.map(m => m.cargo)))];

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.nome.toLowerCase().includes(search.toLowerCase()) || 
                          (member.email && member.email.toLowerCase().includes(search.toLowerCase())) ||
                          (member.cargo && member.cargo.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'All' ? true : member.status === statusFilter;
    const matchesOffice = officeFilter === 'All' ? true : member.cargo === officeFilter;
    return matchesSearch && matchesStatus && matchesOffice;
  });

  const getBase64ImageFromUrl = async (url: string): Promise<string | null> => {
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) return null;
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Error loading image base64:', e);
      return null;
    }
  };

  const generatePDFCarteirinha = async (member: Member) => {
    if (!church) return;
    setGeneratingPdf(true);
    showToast('Gerando PDF da carteirinha...', 'success');

    try {
      // 1. Preload photos
      const memberPhotoBase64 = member.foto_url ? await getBase64ImageFromUrl(member.foto_url) : null;
      const logoBase64 = church.logo_url ? await getBase64ImageFromUrl(church.logo_url) : null;

      // 2. Initialize PDF: double-sided standard card size (85mm x 54mm)
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [54, 85]
      });

      // --- FRONT SIDE ---
      // Background colors
      const themeColor = church.cor_botoes || '#E4A232';
      const bgColor = church.cor_fundo || '#c7e3ff';
      const panelColor = church.cor_paineis || '#fafafa';
      const textColor = church.cor_fontes || '#0f172a';
      const borderColor = church.cor_bordas || '#0a0000';

      // Draw background
      doc.setFillColor(bgColor);
      doc.rect(0, 0, 85, 54, 'F');

      // Top Header accent panel
      doc.setFillColor(borderColor);
      doc.rect(0, 0, 85, 3, 'F');

      // Card Header content container
      doc.setFillColor(panelColor);
      doc.roundedRect(3, 5, 79, 44, 2, 2, 'F');
      doc.setDrawColor(borderColor);
      doc.setLineWidth(0.3);
      doc.roundedRect(3, 5, 79, 44, 2, 2, 'D');

      // Header Border/Divider accent (gold/custom button color)
      doc.setFillColor(themeColor);
      doc.rect(4, 15, 77, 1, 'F');

      // Add logo
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 5, 6, 8, 8);
        } catch (e) {
          console.error('Failed to add logo to PDF:', e);
        }
      }

      // Add Church Title
      doc.setTextColor(borderColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(church.nome.toUpperCase(), 14, 9, { maxWidth: 66 });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor('#64748b');
      doc.text('IPRB - CONSTITUÍDA EM SÃO PAULO', 14, 13);

      // Add Member Photo / Circle Clipping layout
      const photoX = 6;
      const photoY = 18;
      const photoSize = 20;

      // Draw default avatar container / frame behind photo
      doc.setDrawColor(themeColor);
      doc.setLineWidth(0.5);
      doc.ellipse(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, photoSize/2, 'D');

      if (memberPhotoBase64) {
        const docAny = doc as any;
        if (typeof docAny.saveGraphicsState === 'function') {
          try {
            docAny.saveGraphicsState();
            docAny.arc(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 0, 2 * Math.PI, 'F');
            docAny.clip();
            docAny.addImage(memberPhotoBase64, 'JPEG', photoX, photoY, photoSize, photoSize);
            docAny.restoreGraphicsState();
          } catch (e) {
            console.error('Failed to apply circular clip to image in PDF, drawing standard:', e);
            docAny.addImage(memberPhotoBase64, 'JPEG', photoX, photoY, photoSize, photoSize);
          }
        } else {
          // Backward fallback
          doc.addImage(memberPhotoBase64, 'JPEG', photoX, photoY, photoSize, photoSize);
        }
      } else {
        // Render stylized letter avatar when no photo available
        doc.setFillColor(themeColor);
        doc.ellipse(photoX + photoSize/2, photoY + photoSize/2, photoSize/2 - 0.5, photoSize/2 - 0.5, 'F');
        doc.setTextColor('#ffffff');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(member.nome.charAt(0).toUpperCase(), photoX + photoSize/2 - 1.5, photoY + photoSize/2 + 2.5);
      }

      // Member Text Details
      const detailsX = 29;
      doc.setTextColor(textColor);

      // Label: Nome
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4);
      doc.text('NOME DO MEMBRO', detailsX, 19);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(member.nome.toUpperCase(), detailsX, 22.5, { maxWidth: 51 });

      // Label: Cargo / Função
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4);
      doc.text('CARGO / FUNÇÃO', detailsX, 27);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(member.cargo.toUpperCase(), detailsX, 30);

      // Label: Membro Desde / ID
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4);
      doc.text('REGISTRO / CREDENCIAL', detailsX, 34);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.text(`#${member.id.substring(0, 8).toUpperCase()}`, detailsX, 37);

      // Label: Status
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4);
      doc.text('CREDENCIAIS STATUS', detailsX, 41);
      doc.setFillColor(member.status === 'Ativo' ? '#dcfce7' : '#fee2e2');
      doc.roundedRect(detailsX, 42.5, 12, 3, 0.5, 0.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(3.8);
      doc.setTextColor(member.status === 'Ativo' ? '#15803d' : '#b91c1c');
      doc.text(member.status === 'Ativo' ? 'ATIVO' : 'INATIVO', detailsX + 2, 44.8);

      // Label: Data de Emissão in Mono / Small normal
      doc.setTextColor(textColor);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(3.8);
      doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 59, 44.8);


      // --- BACK SIDE (VERSO) ---
      doc.addPage([54, 85], 'landscape');

      // Draw background Back side
      doc.setFillColor(bgColor);
      doc.rect(0, 0, 85, 54, 'F');

      // Footer Accent line
      doc.setFillColor(borderColor);
      doc.rect(0, 51, 85, 3, 'F');

      // Large Panel container
      doc.setFillColor(panelColor);
      doc.roundedRect(3, 4, 79, 44, 2, 2, 'F');
      doc.setDrawColor(borderColor);
      doc.setLineWidth(0.3);
      doc.roundedRect(3, 4, 79, 44, 2, 2, 'D');

      doc.setTextColor(textColor);

      // Info grid layout
      const gridCol1 = 5;
      const gridCol2 = 45;

      // Row 1
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4);
      doc.text('DATA DE NASCIMENTO', gridCol1, 9);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.text(member.data_nascimento ? new Date(member.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não cadastrada', gridCol1, 12);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4);
      doc.text('BATIZADO NAS ÁGUAS', gridCol2, 9);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.text(member.batizado_aguas ? 'SIM' : 'NÃO', gridCol2, 12);

      // Row 2
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4);
      doc.text('EMAIL CONTATO', gridCol1, 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.text(member.email || 'Não cadastrado', gridCol1, 19, { maxWidth: 36 });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4);
      doc.text('BAT. ESPÍRITO SANTO', gridCol2, 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.text(member.batizado_espirito ? 'SIM' : 'NÃO', gridCol2, 19);

      // Row 3
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4);
      doc.text('TELEFONE', gridCol1, 23);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.text(member.telefone || 'Não cadastrado', gridCol1, 26);

      // Add Church metadata address
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4);
      doc.text('DADOS DA CONGREGAÇÃO', gridCol1, 30);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4.8);
      doc.setTextColor('#475569');
      doc.text(`CNPJ: ${church.cnpj || '00.000.000/0001-00'}\nTel: ${church.telefone || 'Não informado'}`, gridCol1, 33, { maxWidth: 36 });

      // Stylized signature container right side
      const sigX = 45;
      const sigY = 28;
      doc.setDrawColor('#cbd5e1');
      doc.setLineWidth(0.2);
      doc.line(sigX, sigY + 11, sigX + 32, sigY + 11);

      doc.setTextColor(textColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4);
      doc.text('ASSINATURA DA DIRETORIA', sigX + 6, sigY + 14);

      // Stylized logo watermark back side
      doc.setFillColor('#f1f5f9');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(3.8);
      doc.setTextColor('#94a3b8');
      doc.text('DOCUMENTO DE IDENTIFICAÇÃO CRISTÃ', 5, 45);

      // Document Save
      doc.save(`Carteirinha_${member.nome.replace(/\s+/g, '_')}.pdf`);
      showToast('Download do PDF concluído!', 'success');
    } catch (e: any) {
      console.error(e);
      showToast('Erro ao gerar carteirinha PDF.', 'error');
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans" id="loading-state">
        <RefreshCw className="w-10 h-10 animate-spin text-amber-500 mb-4" />
        <span className="text-sm font-medium text-slate-500 font-mono text-center">Iniciando Portal do Membro...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ backgroundColor: '#f8fafc' }} id="church-root">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
              toast.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
            id="toast-notification"
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Church Header */}
      <header className="border-b bg-white border-slate-200 sticky top-0 z-40 shadow-xs" id="main-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {church?.logo_url ? (
              <img 
                src={church.logo_url} 
                alt="Logo da Igreja" 
                className="w-12 h-12 object-contain rounded-lg p-1 bg-white border border-slate-100 shadow-sm"
              />
            ) : (
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: church?.cor_botoes || '#E4A232' }}
              >
                IPR
              </div>
            )}
            <div>
              <h1 className="font-sans font-semibold text-lg md:text-xl tracking-tight text-slate-900 leading-tight">
                {church?.nome || 'Igreja Presbiteriana Renovada de Brazlândia'}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-sm">
                  PORTAL DO MEMBRO
                </span>
                {church?.cnpj && (
                  <span className="text-xs text-slate-400 font-mono hidden md:inline">
                    CNPJ: {church.cnpj}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                showToast('Ação de adicionar membro iniciada. Carregando formulário...', 'success');
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-white transition-all shadow-sm hover:scale-[1.02]"
              style={{ backgroundColor: church?.cor_botoes || '#E4A232' }}
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Membro</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main App Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8" id="dashboard-wrapper">
        
        {/* Left Side: Members Directory & Filter Panel */}
        <section className="lg:col-span-7 flex flex-col gap-6" id="members-list-section">
          {/* Controls Panel */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" style={{ color: church?.cor_botoes || '#E4A232' }} />
                <h2 className="font-sans font-medium text-slate-800 text-base">Diretório de Membros</h2>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {filteredMembers.length} de {members.length} membros
              </span>
            </div>

            {/* Inputs & Filters */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search */}
              <div className="relative md:col-span-6">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou cargo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 text-sm rounded-xl focus:outline-hidden focus:border-slate-400 transition-colors"
                />
              </div>

              {/* Status Filter */}
              <div className="md:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded-xl focus:outline-hidden transition-colors"
                >
                  <option value="All">Todos Status</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              {/* Office Filter */}
              <div className="md:col-span-3">
                <select
                  value={officeFilter}
                  onChange={(e) => setOfficeFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded-xl focus:outline-hidden transition-colors"
                >
                  <option value="All">Cargos (Todos)</option>
                  {offices.filter(o => o !== 'All').map(office => (
                    <option key={office} value={office}>{office}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Members List Container */}
          {loading ? (
            <div className="flex-1 min-h-[400px] bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin" style={{ color: church?.cor_botoes || '#E4A232' }} />
              <p className="text-sm font-medium text-slate-500">Conectando ao banco Supabase...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex-1 min-h-[400px] bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center p-8 text-center">
              <Users className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-800 text-base">Nenhum membro encontrado</p>
              <p className="text-slate-400 text-sm max-w-sm mt-1">
                Tente ajustar seus termos de busca ou filtros para localizar outros registros.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[620px] overflow-y-auto pr-1" id="members-grid">
              {filteredMembers.map((member) => (
                <motion.div
                  key={member.id}
                  whileHover={{ y: -2 }}
                  onClick={() => setSelectedMember(member)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex gap-4 ${
                    selectedMember?.id === member.id 
                      ? 'bg-slate-50 border-slate-400 shadow-xs' 
                      : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="relative shrink-0">
                    {member.foto_url ? (
                      <img 
                        src={member.foto_url} 
                        alt={member.nome}
                        className="w-12 h-12 rounded-full object-cover border border-slate-100 shadow-2xs"
                      />
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-2xs"
                        style={{ backgroundColor: church?.cor_botoes || '#E4A232' }}
                      >
                        {member.nome.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                      member.status === 'Ativo' ? 'bg-emerald-500' : 'bg-rose-400'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3 className="font-sans font-medium text-slate-800 text-sm truncate leading-snug">
                        {member.nome}
                      </h3>
                      <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1.5 font-mono">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        {member.cargo}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                      <span suppressHydrationWarning>Nasc: {member.data_nascimento ? new Date(member.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : 'N/A'}</span>
                      <span className="font-semibold" style={{ color: church?.cor_botoes || '#E4A232' }}>Ver Carteirinha →</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Right Side: High Fidelity Carteirinha Maker (Carteira Preview & Download) */}
        <section className="lg:col-span-5 flex flex-col gap-6" id="badge-maker-section">
          {selectedMember ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-sans font-semibold text-slate-800 text-base">Visualização da Carteirinha</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Mockup digital correspondente ao PDF</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] bg-slate-100 px-2 py-1 rounded-sm text-slate-500 font-mono font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  VALIDADO IPR
                </div>
              </div>

              {/* HTML Live Mockup Container */}
              <div className="flex flex-col gap-6 items-center" id="cards-double-sided-prev">
                {/* Frente (FRONT) */}
                <div className="relative w-full max-w-[340px] aspect-[85/54] rounded-xl overflow-hidden shadow-md border flex flex-col justify-between p-3" 
                     style={{ 
                       backgroundColor: church?.cor_fundo || '#c7e3ff', 
                       borderColor: church?.cor_bordas || '#0a0000',
                       color: church?.cor_fontes || '#0f172a'
                     }}>
                  
                  {/* Top Bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900" style={{ backgroundColor: church?.cor_bordas || '#0a0000' }} />

                  {/* Body Content Box */}
                  <div className="flex-1 bg-white border rounded-lg p-2.5 flex flex-col justify-between" 
                       style={{ 
                         backgroundColor: church?.cor_paineis || '#fafafa',
                         borderColor: church?.cor_bordas || '#0a0000'
                       }}>
                    
                    {/* Header */}
                    <div className="flex items-start gap-2 select-none">
                      {church?.logo_url ? (
                        <img 
                          src={church.logo_url} 
                          alt="Logo" 
                          className="w-7 h-7 object-contain"
                        />
                      ) : (
                        <div className="w-7 h-7 bg-amber-500 rounded flex items-center justify-center text-[10px] text-white font-bold">
                          IPR
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-bold text-[8px] tracking-tight uppercase leading-none text-slate-900">
                          {church?.nome || 'Igreja Presbiteriana Renovada'}
                        </h4>
                        <span className="text-[5.5px] text-slate-400 block mt-0.5 leading-none">
                          IPRB - CONGRESSO CONSTITUCIONAL
                        </span>
                      </div>
                    </div>

                    <div className="h-px w-full my-1.5" style={{ backgroundColor: church?.cor_botoes || '#E4A232' }} />

                    {/* Member Meta Grid */}
                    <div className="flex gap-3 items-center">
                      {/* circular avatar wrapper */}
                      <div className="relative shrink-0 w-14 h-14 rounded-full border flex items-center justify-center overflow-hidden" 
                           style={{ borderColor: church?.cor_botoes || '#E4A232' }}>
                        {selectedMember.foto_url ? (
                          <img 
                            src={selectedMember.foto_url} 
                            alt={selectedMember.nome} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div 
                            className="w-full h-full flex items-center justify-center text-white font-bold text-lg"
                            style={{ backgroundColor: church?.cor_botoes || '#E4A232' }}
                          >
                            {selectedMember.nome.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Text details */}
                      <div className="flex-1 min-w-0 space-y-1 text-slate-800">
                        <div>
                          <span className="text-[5px] font-bold text-slate-400 uppercase block leading-none">Nome do Membro</span>
                          <span className="text-[10px] font-bold truncate block tracking-tight leading-normal" style={{ color: church?.cor_bordas || '#0a0000' }}>
                            {selectedMember.nome}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <span className="text-[5px] font-bold text-slate-400 uppercase block leading-none">Cargo</span>
                            <span className="text-[7.5px] font-semibold truncate block leading-normal">{selectedMember.cargo}</span>
                          </div>
                          <div>
                            <span className="text-[5px] font-bold text-slate-400 uppercase block leading-none">Membro ID</span>
                            <span className="text-[7.5px] font-mono font-bold truncate block leading-normal text-slate-500">
                              #{selectedMember.id.substring(0, 8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Row */}
                    <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-100">
                      <span className="text-[6px] font-semibold flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedMember.status === 'Ativo' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {selectedMember.status.toUpperCase()}
                      </span>
                      <span className="text-[6.5px] font-mono text-slate-400" suppressHydrationWarning>
                        Emissão: {new Date().toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Verso (BACK) */}
                <div className="relative w-full max-w-[340px] aspect-[85/54] rounded-xl overflow-hidden shadow-md border flex flex-col justify-between p-3" 
                     style={{ 
                       backgroundColor: church?.cor_fundo || '#c7e3ff', 
                       borderColor: church?.cor_bordas || '#0a0000',
                       color: church?.cor_fontes || '#0f172a'
                     }}>
                  
                  {/* Body Content Box */}
                  <div className="flex-1 bg-white border rounded-lg p-2.5 flex flex-col justify-between" 
                       style={{ 
                         backgroundColor: church?.cor_paineis || '#fafafa',
                         borderColor: church?.cor_bordas || '#0a0000'
                       }}>
                    
                    {/* Grid Info */}
                    <div className="grid grid-cols-2 gap-2 text-[7px]">
                      <div>
                        <span className="text-[5px] font-bold text-slate-400 block leading-none">NASCIMENTO</span>
                        <span className="font-semibold block mt-0.5 leading-tight" suppressHydrationWarning>
                          {selectedMember.data_nascimento ? new Date(selectedMember.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não informado'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[5px] font-bold text-slate-400 block leading-none">BATIZADO ÁGUAS</span>
                        <span className="font-semibold block mt-0.5 leading-tight">{selectedMember.batizado_aguas ? 'SIM' : 'NÃO'}</span>
                      </div>
                      <div>
                        <span className="text-[5px] font-bold text-slate-400 block leading-none">E-MAIL</span>
                        <span className="font-semibold block mt-0.5 truncate leading-tight">{selectedMember.email || 'Não informado'}</span>
                      </div>
                      <div>
                        <span className="text-[5px] font-bold text-slate-400 block leading-none">BAT. ESPÍRITO SANTO</span>
                        <span className="font-semibold block mt-0.5 leading-tight">{selectedMember.batizado_espirito ? 'SIM' : 'NÃO'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[5px] font-bold text-slate-400 block leading-none">TELEFONE</span>
                        <span className="font-semibold block mt-0.5 leading-tight">{selectedMember.telefone || 'Não informado'}</span>
                      </div>
                    </div>

                    {/* Bottom Metadata & Signature */}
                    <div className="grid grid-cols-12 gap-1 border-t border-slate-100 pt-2 items-end">
                      <div className="col-span-7">
                        <span className="text-[4.5px] font-bold text-slate-400 block uppercase">INFORMAÇÕES DA IGREJA</span>
                        <p className="text-[6px] text-slate-500 leading-tight block mt-0.5 font-mono">
                          CNPJ: {church?.cnpj || '00.000.000/0001-00'}<br />
                          Fone: {church?.telefone || '6198000000'}
                        </p>
                      </div>

                      <div className="col-span-5 flex flex-col items-center">
                        <div className="w-full h-px bg-slate-300 mt-1" />
                        <span className="text-[4.8px] scale-90 font-bold text-slate-700 mt-1 uppercase text-center block leading-none">
                          Diretoria Executiva
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Bar Accent */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900" style={{ backgroundColor: church?.cor_bordas || '#0a0000' }} />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => generatePDFCarteirinha(selectedMember)}
                  disabled={generatingPdf}
                  className="w-full py-3 px-4 rounded-xl font-sans font-semibold text-sm transition-all focus:outline-hidden flex items-center justify-center gap-2 cursor-pointer shadow-md select-none disabled:bg-slate-300 disabled:cursor-not-allowed hover:scale-[1.01]"
                  style={{ 
                    backgroundColor: church?.cor_botoes || '#E4A232',
                    color: '#ffffff'
                  }}
                >
                  {generatingPdf ? (
                    <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                  ) : (
                    <Download className="w-4.5 h-4.5" />
                  )}
                  <span>{generatingPdf ? 'Carregando Imagens & PDF...' : 'Baixar Carteirinha (PDF)'}</span>
                </button>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => {
                      showToast('Visualizando ficha completa do membro...', 'success');
                    }}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ficha de Cadastro</span>
                  </button>
                  <button
                    onClick={() => {
                      showToast('QR Code de validação gerado com sucesso.', 'success');
                    }}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Gerar QR Code</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center" id="no-member-selected">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-800 text-base">Nenhum membro selecionado</p>
              <p className="text-slate-400 text-sm max-w-xs mx-auto mt-1">
                Selecione um membro no diretório à esquerda para carregar o emissor de carteirinhas.
              </p>
            </div>
          )}

          {/* Quick Stats Widget */}
          {members.length > 0 && (
            <div className="p-5 rounded-2xl bg-white border border-slate-200 text-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-amber-500" />
                <h3 className="font-semibold text-sm">Resumo da Congregação</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">MEMBROS</span>
                  <span className="text-lg font-bold text-slate-800 mt-1 block">
                    {members.filter(m => m.status === 'Ativo').length}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">BATIZADOS</span>
                  <span className="text-lg font-bold text-slate-800 mt-1 block">
                    {members.filter(m => m.batizado_aguas).length}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">INATIVOS</span>
                  <span className="text-lg font-bold text-slate-800 mt-1 block">
                    {members.filter(m => m.status !== 'Ativo').length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

      </main>

      {/* Footer */}
      <footer className="footer py-6 border-t border-slate-200 bg-white" id="main-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-mono">
          <span suppressHydrationWarning>&copy; {new Date().getFullYear()} {church?.nome || 'Igreja Presbiteriana Renovada de Brazlândia'}. Todos os direitos reservados.</span>
          <span>Tecnologia IPRB - Sistema de Emissão de Credenciais Digitais</span>
        </div>
      </footer>
    </div>
  );
}
