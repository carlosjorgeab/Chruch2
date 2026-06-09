'use client';
import { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Map as MapIcon, Loader2, DollarSign, Users, Target } from 'lucide-react';
import { rsPaths } from './rs-data'; // 497 paths pre-computed from IBGE GeoJSON!
import { useDeputado } from '@/context/DeputadoContext';
import { supabase } from '@/lib/supabase';

// Helper formats
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

const formatCompact = (val: number) => {
  if (val === 0) return 'R$ 0';
  if (val >= 1000000) return `R$ ${(val / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} Mi`;
  if (val >= 1000) return `R$ ${(val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Mil`;
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

interface CityStats {
  populacao: number;
  emendas: number;
  projetos: number;
}

export function RSMapDivisions({ onHover, onBack, selectedYears = [] }: { onHover?: (name: string | null) => void; onBack: () => void; selectedYears?: number[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { selectedDeputado } = useDeputado();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  
  const [mapStats, setMapStats] = useState<Record<string, CityStats>>({});
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoadingStats(true);
      try {
        const stats: Record<string, CityStats> = {};
        
        // 1. Fetch populations
        const { data: popData } = await supabase
          .from('municipio')
          .select('nome, populacao, unidade_federacao!inner(sigla)')
          .eq('unidade_federacao.sigla', 'RS');
          
        if (popData) {
          popData.forEach(item => {
            const cityName = item.nome;
            if (!stats[cityName]) stats[cityName] = { populacao: 0, emendas: 0, projetos: 0 };
            stats[cityName].populacao = item.populacao || 0;
          });
        }

        // 2. Fetch Orcamentos (Emendas)
        let orcQuery = supabase.from('orcamentos').select('municipio, valor, data').eq('etapa', 'Liberado');
        if (selectedDeputado?.id) {
          orcQuery = orcQuery.eq('id_deputado', selectedDeputado.id);
        }
        
        const { data: emendasData, error: eErr } = await orcQuery;
        if (eErr) console.error("Error fetching emendas map data:", eErr);
        
        if (emendasData) {
          emendasData.forEach(item => {
            // Only process items for this state
            if (item.municipio && !item.municipio.toUpperCase().includes('- RS')) return;

            const y = item.data ? new Date(item.data).getFullYear() : new Date().getFullYear();
            if (selectedYears.length > 0 && !selectedYears.includes(y)) return;

            if (item.municipio) {
               const cityName = item.municipio.split('-')[0].trim();
               if (stats[cityName]) {
                  stats[cityName].emendas += Number(item.valor || 0);
               } else {
                  // Try case-insensitive fallback if exact match fails
                  const cityKey = Object.keys(stats).find(k => k.toLowerCase() === cityName.toLowerCase());
                  if (cityKey) stats[cityKey].emendas += Number(item.valor || 0);
               }
            }
          });
        }
        
        setMapStats(stats);
      } catch (err) {
        console.error("Error loading map stats:", err);
      } finally {
        setLoadingStats(false);
      }
    }
    
    loadStats();
  }, [selectedDeputado?.id, selectedYears]);

  // Handle dynamic range calculation for heat map
  const nonZeroTotals = Object.values(mapStats)
    .map(stat => stat.emendas || 0)
    .filter(val => val > 0);
    
  let thresholds: number[] = [];
  if (nonZeroTotals.length > 0) {
    const minVal = Math.min(...nonZeroTotals);
    const maxVal = Math.max(...nonZeroTotals);
    if (minVal === maxVal) {
      thresholds = [maxVal];
    } else {
      const step = (maxVal - minVal) / 4;
      thresholds = [
        minVal + step,
        minVal + step * 2,
        minVal + step * 3,
        maxVal
      ];
    }
  }

  const getDynamicOpacity = (cityName: string): number | null => {
    if (!mapStats[cityName]) return null;
    const total = mapStats[cityName].emendas || 0;
    if (total <= 0) return null;
    if (thresholds.length === 0) return null;
    
    // Exact match for thresholds if only one
    if (thresholds.length === 1) return 1.0;
    
    // Find the range
    if (total <= thresholds[0]) return 0.3;
    if (total <= thresholds[1]) return 0.55;
    if (total <= thresholds[2]) return 0.8;
    return 1.0;
  };

  return (
    <div className="w-full flex md:p-6 flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="w-full flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6 px-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Mapa do Brasil
        </button>
        <div className="flex items-center gap-2 text-sm font-bold text-primary bg-primary/10 px-4 py-2 rounded-lg border border-primary/20 uppercase tracking-widest">
          <MapIcon className="w-4 h-4" />
          Rio Grande do Sul: Divisões Municipais
        </div>
      </div>
      
      <div className="relative w-full flex items-center justify-center min-h-[600px] bg-slate-50 rounded-xl border border-slate-200 shadow-inner p-4 overflow-hidden">
        <div ref={containerRef} className="w-full h-full max-w-[800px] relative z-0 flex justify-center">
              <svg 
                id="rs-municipal-map"
                viewBox="0 0 800 600" 
                className="w-full h-full drop-shadow-2xl transition-all duration-500"
                strokeLinecap="round" 
                strokeLinejoin="round" 
              >
                  {rsPaths.map((path) => {
                      const opacidade = getDynamicOpacity(path.name);
                      const hasRecursos = opacidade !== null;
                      
                      return (
                      <path
                          key={path.id}
                          id={path.id}
                          d={path.d}
                          fill={hoveredId === path.id ? "var(--color-primary, #d80000)" : (hasRecursos ? "var(--color-primary, #d80000)" : "#e2e8f0")}
                          fillOpacity={hoveredId === path.id ? 1 : (hasRecursos ? opacidade : 1)}
                          stroke="#1e293b" // slate-800 for dark gray/black borders
                          strokeWidth={hoveredId === path.id ? "1.5" : (hasRecursos ? "0.8" : "0.5")}
                          className="transition-all duration-200 cursor-pointer"
                          onMouseEnter={() => {
                              setHoveredId(path.id);
                              setHoveredName(path.name);
                              onHover?.(path.name);
                          }}
                          onMouseLeave={() => {
                              setHoveredId(null);
                              setHoveredName(null);
                              onHover?.(null);
                          }}
                      >
                          <title>{path.name}</title>
                      </path>
                  )})}
            </svg>

            {/* Tooltip implementation */}
            {hoveredName && (
                <div className="absolute pointer-events-none bg-slate-900/95 backdrop-blur-sm text-white px-3 py-2 rounded-lg shadow-xl z-50 transition-all border border-slate-700 whitespace-nowrap flex flex-col gap-1.5"
                     style={{ 
                         left: '50%',
                         top: '10px',
                         transform: 'translateX(-50%)'
                     }}
                >
                    <div className="font-bold text-sm border-b border-white/10 pb-1 mb-0.5 uppercase tracking-wide">
                        {hoveredName}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        <span>População:</span>
                        <span className="font-medium text-white ml-auto">
                            {mapStats[hoveredName]?.populacao ? formatNumber(mapStats[hoveredName].populacao) : 'N/A'}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                        <DollarSign className="w-3.5 h-3.5 text-green-400" />
                        <span>Emendas:</span>
                        <span className="font-medium text-white ml-auto">
                            {formatCurrency(mapStats[hoveredName]?.emendas || 0)}
                        </span>
                    </div>
                    
                    {/* Removed Projetos tooltip */}
                </div>
            )}
        </div>
        
        {/* Info Legend */}
        <div className="absolute bottom-4 right-4 bg-white/60 hover:bg-white/95 transition-all backdrop-blur-xl pl-3 pr-4 py-3 rounded-2xl shadow-xl border border-slate-200/40 z-20 scale-75 sm:scale-90 origin-bottom-right pointer-events-auto group">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200/30">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <h4 className="font-black text-slate-800 uppercase tracking-[0.2em] text-[9px]">Classificação de Recursos</h4>
            </div>
            
            {loadingStats ? (
                <div className="flex items-center gap-2 text-[10px] text-slate-500 my-2 font-bold italic">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    Sincronizando...
                </div>
            ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-md shadow-sm border border-slate-400 bg-slate-200"></div>
                    <span className="text-slate-500 text-[10px] font-bold">Sem Destinação</span>
                  </div>
                  
                  {thresholds.length === 4 && (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-md shadow-sm border border-slate-700 bg-primary opacity-30"></div>
                        <span className="text-slate-700 text-[10px] font-bold">Até {formatCompact(thresholds[0])}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-md shadow-sm border border-slate-700 bg-primary opacity-55"></div>
                        <span className="text-slate-700 text-[10px] font-bold">Até {formatCompact(thresholds[1])}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-md shadow-sm border border-slate-700 bg-primary opacity-80"></div>
                        <span className="text-slate-700 text-[10px] font-bold">Até {formatCompact(thresholds[2])}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-md shadow-sm border border-slate-700 bg-primary"></div>
                        <span className="text-slate-700 text-[10px] font-bold">Acima de {formatCompact(thresholds[2])}</span>
                      </div>
                    </>
                  )}
                  {thresholds.length === 1 && (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-md shadow-sm border border-slate-700 bg-primary"></div>
                        <span className="text-slate-700 text-[10px] font-bold">{formatCompact(thresholds[0])}</span>
                      </div>
                  )}
                  {thresholds.length === 0 && !loadingStats && (
                    <div className="text-[10px] text-slate-400 font-medium">Nenhum recurso no período</div>
                  )}
                </div>
            )}
            
            <div className="mt-4 pt-2 border-t border-slate-200/30">
               <p className="text-[8px] text-slate-400 uppercase tracking-tighter leading-tight font-bold">
                 Base: Municípios RS • IBGE 2024
               </p>
            </div>
        </div>
      </div>
    </div>
  );
}
