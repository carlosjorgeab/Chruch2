'use client';
import { useState, useEffect } from 'react';
import { RefreshCw, Calendar, MapPin, Tag, Filter } from 'lucide-react';
import { useFilters } from '@/context/FilterContext';
import { useDeputado } from '@/context/DeputadoContext';
import { supabase } from '@/lib/supabase';

export function Filters() {
  const { filters, setFilters, resetFilters } = useFilters();
  const { selectedDeputado } = useDeputado();
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [municipios, setMunicipios] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);

  useEffect(() => {
    async function fetchOptions() {
      if (!selectedDeputado?.id) return;
      
      const { data: areasData } = await supabase.from('areas_tematicas').select('*').order('nome');
      if (areasData) setAreas(areasData);

      // Fetch Years based on primary tables only as per user request
      try {
        const years = new Set<number>();
        // Emendas
        const { data: eData } = await supabase.from('orcamentos').select('data').eq('id_deputado', selectedDeputado.id).eq('etapa', 'Liberado');
        eData?.forEach(e => { if (e.data) years.add(new Date(e.data).getFullYear()); });

        if (years.size === 0) years.add(new Date().getFullYear());
        setAvailableYears(Array.from(years).sort((a, b) => b - a));
      } catch (err) { console.error("Error years:", err); }

      // Fetch Municipios
      try {
        const { data: mData } = await supabase
          .from('municipio')
          .select('nome, unidade_federacao!inner(sigla)')
          .eq('unidade_federacao.sigla', selectedDeputado.estado)
          .order('nome');
        if (mData) setMunicipios(mData);
      } catch (err) { console.error("Error municipios:", err); }
    }
    fetchOptions();
  }, [selectedDeputado?.id, selectedDeputado?.estado]);

  const toggleYear = (year: number) => {
    const newAnos = filters.anosFiscais.includes(year)
      ? filters.anosFiscais.filter(y => y !== year)
      : [...filters.anosFiscais, year];
    setFilters({ ...filters, anosFiscais: newAnos });
  };

  const toggleAllYears = () => {
    if (filters.anosFiscais.length === availableYears.length) {
      setFilters({ ...filters, anosFiscais: [] });
    } else {
      setFilters({ ...filters, anosFiscais: [...availableYears] });
    }
  };

  return (
    <section className="glass-panel p-4 rounded-xl shadow-sm border border-white/50 overflow-hidden">
      {/* Label for section - Moved above */}
      <div className="flex items-center gap-2 mb-4">
        <Filter size={16} className="text-black" />
        <h5 className="text-sm font-black uppercase text-black tracking-tighter">Filtros Inteligentes</h5>
        
        <button 
          onClick={() => resetFilters()}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 hover:text-primary transition-colors ml-auto px-2 py-1 rounded-lg hover:bg-primary/5"
          title="Resetar Filtros"
        >
          <RefreshCw size={14} />
          Resetar Filtros
        </button>
      </div>

      <div className="flex flex-nowrap items-center gap-4 lg:gap-6 overflow-x-auto no-scrollbar">
        {/* Dynamic Year Multi-select */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2 whitespace-nowrap shrink-0">
            <Calendar size={14} className="text-primary" />
            Ano
          </label>
          <div className="flex gap-1.5 py-1">
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => toggleYear(year)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border whitespace-nowrap shrink-0 ${
                  filters.anosFiscais.includes(year)
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                {year}
              </button>
            ))}
            <button 
              onClick={toggleAllYears}
              className="text-xs font-black uppercase text-primary px-2 hover:bg-primary/5 rounded shrink-0 whitespace-nowrap"
            >
              {filters.anosFiscais.length === availableYears.length ? 'Nenhum' : 'Todos'}
            </button>
          </div>
        </div>

        <div className="h-8 w-[1px] bg-slate-200 shrink-0"></div>

        {/* Municipality Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <MapPin size={14} className="text-primary shrink-0" />
          <select 
            className="bg-transparent border-none font-bold text-slate-700 text-sm focus:ring-0 outline-none cursor-pointer truncate"
            value={filters.municipio}
            onChange={(e) => setFilters({ ...filters, municipio: e.target.value })}
          >
            <option value="Todos">Município: Todos</option>
            {municipios.map((mun, idx) => (
              <option key={idx} value={`${mun.nome} - ${mun.unidade_federacao.sigla}`}>
                {mun.nome} - {mun.unidade_federacao.sigla}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo Verba */}
        <div className="flex items-center gap-2 shrink-0">
          <Tag size={14} className="text-primary shrink-0" />
          <select 
            className="bg-transparent border-none font-bold text-slate-700 text-sm focus:ring-0 outline-none cursor-pointer whitespace-nowrap"
            value={filters.tipoVerba}
            onChange={(e) => setFilters({ ...filters, tipoVerba: e.target.value })}
          >
            <option value="Todas">Verba: Todas</option>
            <option value="Emendas">Emendas</option>
          </select>
        </div>

        {/* Dynamic Area Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <Tag size={14} className="text-primary shrink-0" />
          <select 
            className="bg-transparent border-none font-bold text-slate-700 text-sm focus:ring-0 outline-none cursor-pointer"
            value={filters.categoria}
            onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
          >
            <option value="Todas">Categoria: Todas</option>
            {areas.map(area => (
              <option key={area.id} value={area.nome}>{area.nome}</option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
