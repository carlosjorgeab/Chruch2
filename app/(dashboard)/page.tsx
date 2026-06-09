'use client';
import { KpiCards } from '@/components/KpiCards';
import { Filters } from '@/components/Filters';
import { Charts } from '@/components/Charts';
import { EmendasTable } from '@/components/EmendasTable';
import { Share, Download } from 'lucide-react';
import { useDeputado } from '@/context/DeputadoContext';
import { FilterProvider } from '@/context/FilterContext';

export default function Home() {
  const { selectedDeputado } = useDeputado();

  const handleShare = async () => {
    const publicIdentifier = selectedDeputado?.slug || selectedDeputado?.id;
    const publicUrl = `${window.location.origin}/p/${publicIdentifier}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Painel do Deputado ${selectedDeputado?.nome || ''}`,
          text: 'Confira as iniciativas e emendas no Chruch Management.',
          url: publicUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(publicUrl);
      alert('Link público copiado para a área de transferência!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <FilterProvider>
      <div className="p-8 space-y-8">
        
        {/* Dashboard Header & Personal Info */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <p className="text-sm font-bold text-primary uppercase tracking-widest mb-1">Visão Consolidada</p>
            <h2 className="text-2xl md:text-3xl font-black font-headline text-on-surface">
              {selectedDeputado ? `Dep. ${selectedDeputado.nome}` : 'Carregando...'}
            </h2>
            <p className="text-on-surface-variant text-sm">Gerenciamento de emendas e projetos parlamentares - 56ª Legislatura</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={handleShare}
              className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Share size={18} />
              Compartilhar
            </button>
            <button 
              onClick={handlePrint}
              className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all shadow-md"
            >
              <Download size={18} />
              Gerar PDF
            </button>
          </div>
        </div>
        
        <Filters />
        <KpiCards />
        <Charts />
        <EmendasTable />
        
      </div>
    </FilterProvider>
  );
}
