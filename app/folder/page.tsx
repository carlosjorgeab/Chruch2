'use client';
import Link from 'next/link';
import { LayoutDashboard, MapPin, Receipt, FileText, FileSignature, Shield, CheckCircle2, ChevronRight, Printer } from 'lucide-react';

export default function FolderPage() {
  return (
    <div className="min-h-screen bg-slate-50 relative print:bg-white">
      {/* Botão de impressão (não aparece na impressão) */}
      <div className="fixed top-8 right-8 print:hidden z-50">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg"
        >
          <Printer size={20} />
          Salvar como PDF
        </button>
        <Link href="/" className="ml-4 text-slate-500 hover:text-slate-700 font-bold underline">
          Voltar ao Sistema
        </Link>
      </div>

      <div className="max-w-4xl mx-auto bg-white min-h-screen shadow-2xl print:shadow-none print:w-full print:max-w-none">
        {/* Capa */}
        <div className="h-screen flex flex-col justify-center items-center text-center p-12 bg-gradient-to-br from-primary/10 via-white to-secondary/10 relative overflow-hidden break-after-page">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-secondary"></div>
          
          <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 border border-slate-100">
            <LayoutDashboard size={48} className="text-primary" />
          </div>
          
          <h1 className="text-5xl font-black font-headline text-slate-900 mb-6 uppercase tracking-tight">
            Gestão de <span className="text-primary">Mandato</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl font-medium mb-12">
            Solução inteligente para controle e acompanhamento de Emendas Parlamentares, Projetos e Editais.
          </p>
          
          <div className="grid grid-cols-3 gap-8 w-full max-w-3xl mt-12">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                <Shield size={24} />
              </div>
              <h3 className="font-bold text-slate-900 uppercase text-sm tracking-widest text-center">Transparência</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
              <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mb-4">
                <MapPin size={24} />
              </div>
              <h3 className="font-bold text-slate-900 uppercase text-sm tracking-widest text-center">Geolocalização</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
              <div className="w-12 h-12 bg-tertiary/10 text-tertiary rounded-full flex items-center justify-center mb-4">
                <FileSignature size={24} />
              </div>
              <h3 className="font-bold text-slate-900 uppercase text-sm tracking-widest text-center">Gestão Eficiente</h3>
            </div>
          </div>
        </div>

        {/* Visão Geral & Mapa */}
        <div className="p-16 break-after-page">
          <div className="mb-16">
            <h2 className="text-3xl font-black text-primary uppercase tracking-tight mb-4 flex items-center gap-3">
              <LayoutDashboard size={32} /> Visão Geral
            </h2>
            <p className="text-slate-600 mb-8 font-medium leading-relaxed">
              O Painel de Visão Geral (Dashboard) oferece um panorama completo do mandato. Acompanhe os principais indicadores (KPIs), valores destinados em emendas e projetos, e o status de execução de cada iniciativa em um único lugar.
            </p>
            {/* Espaço para print */}
            <div className="w-full h-[400px] bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest relative overflow-hidden">
              [ Inserir Print da Visão Geral Aqui ]
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-black text-secondary uppercase tracking-tight mb-4 flex items-center gap-3">
              <MapPin size={32} /> Visão Mapa
            </h2>
            <p className="text-slate-600 mb-8 font-medium leading-relaxed">
              Visualize a distribuição geográfica dos recursos. A Visão Mapa interativa permite identificar rapidamente quais municípios do Paraná, São Paulo e Rio Grande do Sul estão recebendo investimentos de Emendas e Projetos liberados.
            </p>
            {/* Espaço para print */}
            <div className="w-full h-[400px] bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest relative overflow-hidden">
              [ Inserir Print da Visão Mapa Aqui ]
            </div>
          </div>
        </div>

        {/* Gestão de Emendas e Projetos */}
        <div className="p-16 break-after-page bg-slate-50">
          <div className="mb-16">
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-3">
              <Receipt size={32} className="text-primary" /> Emendas Parlamentares
            </h2>
            <p className="text-slate-600 mb-6 font-medium leading-relaxed">
              Controle detalhado de todas as emendas destinadas. Acompanhe o fluxo ponta-a-ponta, desde o rascunho até a liberação e execução.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-slate-700 font-medium">
                <CheckCircle2 size={20} className="text-green-500" /> Vínculo automático com Ministérios e Ações.
              </li>
              <li className="flex items-center gap-3 text-slate-700 font-medium">
                <CheckCircle2 size={20} className="text-green-500" /> Controle de status (Rascunho / Liberado).
              </li>
              <li className="flex items-center gap-3 text-slate-700 font-medium">
                <CheckCircle2 size={20} className="text-green-500" /> Histórico completo de alterações.
              </li>
            </ul>
            {/* Espaço para print */}
             <div className="w-full h-[300px] bg-slate-200 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest">
              [ Inserir Print das Emendas Aqui ]
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-3">
              <FileText size={32} className="text-secondary" /> Gestão de Projetos
            </h2>
            <p className="text-slate-600 mb-8 font-medium leading-relaxed">
              Acompanhamento de todos os projetos estruturantes do mandato, com organização por área temática, município e valor investido.
            </p>
            {/* Espaço para print */}
            <div className="w-full h-[300px] bg-slate-200 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest">
              [ Inserir Print dos Projetos Aqui ]
            </div>
          </div>
        </div>

        {/* Editais e Adesões */}
        <div className="p-16 break-after-page">
          <div className="flex flex-col items-center text-center mb-16">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <FileSignature size={40} className="text-primary" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight mb-4">Editais e Adesões</h2>
            <p className="text-slate-600 font-medium max-w-2xl">
              Sistema completo para publicação de editais e captação de propostas de entidades parceiras de forma transparente.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-12">
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-4 uppercase tracking-widest text-sm border-b-2 border-primary inline-block pb-2">Gestão de Editais</h3>
              <p className="text-slate-600 font-medium mb-6">
                Cadastro de editais com definição de prazos e upload do edital em PDF. Visão unificada das inscrições vinculadas a cada edital.
              </p>
               <div className="w-full h-[250px] bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 text-sm font-bold uppercase tracking-widest">
                [ Print Editais ]
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-4 uppercase tracking-widest text-sm border-b-2 border-secondary inline-block pb-2">Recebimento de Adesões</h3>
              <p className="text-slate-600 font-medium mb-6">
                As entidades enviam seus dados, planilhas de orçamento e currículos diretamente pelo sistema. Avaliação simplificada pela equipe.
              </p>
               <div className="w-full h-[250px] bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 text-sm font-bold uppercase tracking-widest">
                [ Print Adesões ]
              </div>
            </div>
          </div>
        </div>
        
        {/* Contato/Fim */}
        <div className="bg-slate-900 text-white p-16 text-center">
          <LayoutDashboard size={48} className="mx-auto text-primary mb-6" />
          <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Gestão Plena do Mandato</h2>
          <p className="text-slate-400 max-w-xl mx-auto font-medium mb-8">
            Tecnologia a favor da transparência e eficiência na destinação de recursos públicos.
          </p>
          <div className="w-16 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full"></div>
        </div>

      </div>
    </div>
  );
}
