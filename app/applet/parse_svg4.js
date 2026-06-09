const fs = require('fs');

let svg = fs.readFileSync('portal_svg.txt', 'utf8');

// Basic JSX replacements
svg = svg.replace(/<svg /, '<svg className="max-w-3xl w-full h-[500px] mx-auto drop-shadow-md transition-opacity duration-300 opacity-100" ');
svg = svg.replace(/class="/g, 'className="');
svg = svg.replace(/stroke-width="/g, 'strokeWidth="');
svg = svg.replace(/stroke-linecap="/g, 'strokeLinecap="');
svg = svg.replace(/stroke-linejoin="/g, 'strokeLinejoin="');
svg = svg.replace(/enable-background="/g, 'enableBackground="');
svg = svg.replace(/xml:space="/g, 'xmlSpace="');

// Clean duplicate classNames explicitly in SVG root
svg = svg.replace(/className="max-w-3xl w-full h-\[500px\] mx-auto drop-shadow-md transition-opacity duration-300 opacity-100"  version="1.1" className="svg-mapa-brasil"/, 'version="1.1" className="svg-mapa-brasil max-w-3xl w-full h-[500px] mx-auto drop-shadow-md transition-opacity duration-300 opacity-100"');

// The SVG has multiple states grouped under <a> tags.
svg = svg.replace(/<a\s+className="estado\s+([a-z]{2})">([\s\S]*?)<\/a>/g, (match, uf, inner) => {
  let content = inner;

  content = content.replace(/<path([^>]*)><\/path>/g, (pathMatch, pathContent) => {
    let isCircle = pathContent.includes('className="circle"');
    
    // Clean old strokes
    let cleaned = pathContent.replace(/stroke="[^"]*"/g, '').replace(/strokeWidth="[^"]*"/g, '').replace(/strokeLinecap="[^"]*"/g, '').replace(/strokeLinejoin="[^"]*"/g, '');
    
    if (isCircle) {
      return `<path ${cleaned} fill={activeUF === '${uf}' ? '#061d3e' : '#cbd5e1'}></path>`;
    } else {
      return `<path ${cleaned} fill={activeUF === '${uf}' ? 'var(--color-primary)' : '#e2e8f0'} className={activeUF === '${uf}' ? 'transition-all duration-500 transform scale-[1.01] origin-center z-10' : 'transition-colors duration-300'} stroke="var(--color-background)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>`;
    }
  });
  
  content = content.replace(/<text([^>]*)fill="#FFFFFF"([^>]*)>([^<]*)<\/text>/g, (textMatch, p1, p2, textContent) => {
    return `<text ${p1} fill={activeUF === '${uf}' ? '#ffffff' : '#64748b'} ${p2} style={{fontSize: '11px', fontWeight: 'bold', pointerEvents: 'none'}}>${textContent}</text>`;
  });

  return `<g id="state-${uf}" style={{ cursor: activeUF === '${uf}' ? 'pointer' : 'default' }} onClick={() => handleStateClick('${uf}')} className={activeUF === '${uf}' ? 'hover:opacity-90' : ''}>\n${content}\n</g>`;
});

const fileContent = `
'use client';
import { useDeputado } from '@/context/DeputadoContext';
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { ArrowLeft, Map as MapIcon } from 'lucide-react';

const stateNameToUF: Record<string, string> = {
  'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM', 'Bahia': 'BA', 'Ceará': 'CE',
  'Distrito Federal': 'DF', 'Espírito Santo': 'ES', 'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT',
  'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
  'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
  'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO'
};

function StateDetailMap({ uf, onBack }: { uf: string; onBack: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchAndRender = async () => {
      if (!uf || !containerRef.current) return;
      setLoading(true);

      try {
        const [geoData, namesData] = await Promise.all([
          fetch(\`https://servicodados.ibge.gov.br/api/v3/malhas/estados/\${uf.toUpperCase()}?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio\`).then(res => res.json()),
          fetch(\`https://servicodados.ibge.gov.br/api/v1/localidades/estados/\${uf.toUpperCase()}/municipios\`).then(res => res.json())
        ]);

        if (!active || !containerRef.current) return;

        const namesMap = new Map();
        namesData.forEach((m: any) => namesMap.set(m.id.toString(), m.nome));

        const width = 800;
        const height = 500;

        d3.select(containerRef.current).select('svg').remove();

        const svg = d3.select(containerRef.current)
          .append('svg')
          .attr('viewBox', \`0 0 \${width} \${height}\`)
          .attr('class', 'max-w-3xl w-full h-[500px] mx-auto drop-shadow-md');

        const margin = 20;
        const fitProjection = d3.geoMercator().fitExtent([[margin, margin], [width - margin, height - margin]], geoData);
        const pathGenerator = d3.geoPath().projection(fitProjection);

        svg.append('g')
          .selectAll('path')
          .data(geoData.features)
          .join('path')
          .attr('d', pathGenerator as any)
          .attr('fill', 'var(--color-primary)')
          .attr('stroke', 'var(--color-background)')
          .attr('stroke-width', 0.5)
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap', 'round')
          .attr('class', 'transition-colors duration-200 hover:opacity-80 cursor-pointer')
          .on('mouseover', function() { d3.select(this).attr('fill', '#0f3c7e') })
          .on('mouseout', function() { d3.select(this).attr('fill', 'var(--color-primary)') })
          .append('title')
          .text((d: any) => namesMap.get(d.properties?.codarea) || "Município");

      } catch (error) {
        console.error('Error fetching state topology:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchAndRender();
    return () => { active = false; };
  }, [uf]);

  return (
    <div className="w-full flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="w-full flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Mapa do Brasil
        </button>
        <div className="flex items-center gap-2 text-sm font-bold text-primary bg-primary/10 px-4 py-2 rounded-lg border border-primary/20 uppercase tracking-widest">
          <MapIcon className="w-4 h-4" />
          Mapa Expandido: {uf.toUpperCase()}
        </div>
      </div>
      
      <div className="relative w-full flex items-center justify-center min-h-[500px] bg-slate-50 rounded-xl border border-slate-200 shadow-inner p-4">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10 rounded-xl">
            <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
        )}
        <div ref={containerRef} className="w-full relative z-0 flex justify-center"></div>
        
        {/* Info Legend */}
        {!loading && (
          <div className="absolute bottom-6 right-6 bg-white pl-4 pr-6 py-4 rounded-xl shadow-md border border-slate-200 z-10">
            <h4 className="font-bold text-slate-700 mb-3 uppercase tracking-widest text-[10px]">Visualização do Estado</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-md shadow-sm border border-black/5" style={{ backgroundColor: 'var(--color-primary)' }}></div>
                <span className="text-slate-600 text-xs font-semibold">Municípios de {uf.toUpperCase()}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 max-w-[200px] leading-tight">
              Passe o cursor sobre as divisões para identificar o nome dos municípios.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function StateMap() {
  const { selectedDeputado } = useDeputado();
  const [activeUF, setActiveUF] = useState('');
  const [viewMode, setViewMode] = useState<'brasil' | 'estado'>('brasil');

  useEffect(() => {
    if (selectedDeputado?.estado) {
      const estado = selectedDeputado.estado;
      let uf = stateNameToUF[estado] || estado;
      
      if(uf && uf.length === 2) {
         setActiveUF(uf.toLowerCase());
      }
    } else {
      setActiveUF('');
    }
    // Always reset to 'brasil' view when deputy changes
    setViewMode('brasil');
  }, [selectedDeputado]);

  const handleStateClick = (uf: string) => {
    if (activeUF === uf) {
      setViewMode('estado');
    }
  };

  if (viewMode === 'estado' && activeUF) {
    return <StateDetailMap uf={activeUF} onBack={() => setViewMode('brasil')} />;
  }

  return (
    <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center relative bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner p-4 animate-in fade-in duration-500">
      <div className="w-full relative overflow-y-auto overflow-x-hidden flex items-center justify-center p-4 lg:p-8">
        ${svg}
      </div>

      {/* Legend / Info */}
      <div className="absolute bottom-6 right-6 bg-white pl-4 pr-6 py-4 rounded-xl shadow-md border border-slate-200 pointer-events-none">
        <h4 className="font-bold text-slate-700 mb-3 uppercase tracking-widest text-[10px]">Legenda do Mapa</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-md shadow-sm border border-black/5" style={{ backgroundColor: 'var(--color-primary)' }}></div>
            <span className="text-slate-600 text-xs font-semibold">Estado do deputado <span className="text-[10px] text-primary block mt-0.5">(Clique para expandir)</span></span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-[#e2e8f0] rounded-md border border-slate-300 shadow-sm"></div>
            <span className="text-slate-600 text-xs font-medium">Demais estados</span>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('components/StateMap.tsx', fileContent);
console.log('StateMap.tsx generated successfully with correctly escaped template strings!');
