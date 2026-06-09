'use client';
import { useDeputado } from '@/context/DeputadoContext';
import { StateMap } from '@/components/StateMap';
import { MapPin, DollarSign, Map, FileText, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function MapaPage() {
  const { selectedDeputado } = useDeputado();
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCount: 0,
    totalValor: 0,
    totalMunicipios: 0
  });

  // Fetch available years once
  useEffect(() => {
    async function fetchYears() {
      if (!selectedDeputado?.id) return;
      
      try {
        const years = new Set<number>();
        
        const { data: emendasData, error: eErr } = await supabase
          .from('orcamentos')
          .select('data')
          .eq('id_deputado', selectedDeputado.id)
          .eq('etapa', 'Liberado');
        
        if (eErr) console.error("Error fetching emendas years:", eErr);
        emendasData?.forEach(e => { 
          if (e.data) years.add(new Date(e.data).getFullYear()); 
        });

        const { data: projetosData, error: pErr } = await supabase
          .from('projetos')
          .select('data')
          .eq('id_deputado', selectedDeputado.id)
          .eq('etapa', 'Liberado');
        
        if (pErr) console.error("Error fetching projetos years:", pErr);
        projetosData?.forEach(p => { 
          if (p.data) years.add(new Date(p.data).getFullYear()); 
        });
        
        // Ensure current year is at least an option if no data
        if (years.size === 0) years.add(new Date().getFullYear());
        
        const yearsArray = Array.from(years).sort((a, b) => b - a);
        setAvailableYears(yearsArray);
        setSelectedYears(prev => prev.length === 0 ? yearsArray : prev); // Only initialize if nothing was selected
      } catch (err) {
        console.error("Error fetching years:", err);
      }
    }
    fetchYears();
  }, [selectedDeputado?.id]);

  useEffect(() => {
    async function fetchStats() {
      if (!selectedDeputado?.id) return;
      setStatsLoading(true);
      
      try {
        const { data: emendas, error: eErr } = await supabase
          .from('orcamentos')
          .select('municipio, valor, data')
          .eq('id_deputado', selectedDeputado.id)
          .eq('etapa', 'Liberado');
          
        if (eErr) console.error("Error fetching emendas stats:", eErr);
          

          
        if (emendas) {
          let eList = emendas || [];

          // Apply year filter
          if (selectedYears.length > 0) {
             eList = eList.filter(e => {
               const y = e.data ? new Date(e.data).getFullYear() : new Date().getFullYear();
               return selectedYears.includes(y);
             });
          } else {
            // If none selected, result is 0
            eList = [];
          }

          const normalizeMun = (m: string) => m ? m.split('-')[0].trim().toLowerCase() : '';
          const uniqueMunSet = new Set<string>();
          
          eList.forEach(e => {
            const m = normalizeMun(e.municipio);
            if (m) uniqueMunSet.add(m);
          });
          const totalE = eList.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
          
          setStats({
            totalCount: eList.length,
            totalValor: totalE,
            totalMunicipios: uniqueMunSet.size
          });
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setStatsLoading(false);
      }
    }
    
    fetchStats();
  }, [selectedDeputado?.id, selectedYears]);

  const toggleYear = (year: number) => {
    setSelectedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  const toggleAllYears = () => {
    if (selectedYears.length === availableYears.length) {
      setSelectedYears([]); // Deselect all
    } else {
      setSelectedYears([...availableYears]); // Select all
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black font-headline text-on-surface flex items-center gap-2">
            <MapPin size={28} className="text-primary" />
            Mapa de Destinação de Recursos {selectedDeputado?.estado ? `(${selectedDeputado.estado})` : ''}
          </h2>
          <p className="text-slate-500 mt-2">Visão geográfica geral da distribuição de recursos de emendas e projetos parlamentares.</p>
        </div>
        
        {/* Year Filter */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm min-w-[200px]">
          <div className="flex items-center justify-between gap-4 mb-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-primary" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-700">Filtro de Período</span>
            </div>
            {availableYears.length > 0 && (
              <button 
                onClick={toggleAllYears}
                className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary-container transition-colors"
              >
                {selectedYears.length === availableYears.length ? 'Limpar' : 'Todos'}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {availableYears.map(year => (
              <button 
                key={year} 
                onClick={() => toggleYear(year)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  selectedYears.includes(year) 
                  ? 'bg-primary text-white border-primary shadow-sm scale-105' 
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {year}
              </button>
            ))}
            {availableYears.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse">
                <Calendar size={12} />
                <span>Buscando anos...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards - Portal da Transparencia style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 border-l-4 border-l-blue-600 relative overflow-hidden">
          {statsLoading && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 animate-pulse" />}
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-tight">Total Destinado</p>
            <p className="text-2xl font-black text-slate-800 tracking-tighter">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalValor)}
            </p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 border-l-4 border-l-emerald-500 relative overflow-hidden">
          {statsLoading && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 animate-pulse" />}
          <div className="p-3 bg-emerald-50 text-emerald-500 rounded-full">
            <Map size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-tight">Municípios Atendidos</p>
            <p className="text-2xl font-black text-slate-800 tracking-tighter">{stats.totalMunicipios}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 border-l-4 border-l-amber-500 relative overflow-hidden">
          {statsLoading && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 animate-pulse" />}
          <div className="p-3 bg-amber-50 text-amber-500 rounded-full">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-tight">Emendas</p>
            <p className="text-2xl font-black text-slate-800 tracking-tighter">{stats.totalCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex flex-col min-h-[600px]">
        <div className="flex-1 relative rounded-lg overflow-hidden border border-slate-100">
          <StateMap selectedYears={selectedYears} />
        </div>
      </div>
    </div>
  );
}
