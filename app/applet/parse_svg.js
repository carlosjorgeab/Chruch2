const fs = require('fs');

let svg = fs.readFileSync('portal_svg.txt', 'utf8');

// Basic JSX replacements
svg = svg.replace(/<svg /, '<svg className="max-w-2xl w-full h-auto mx-auto drop-shadow-md" ');
svg = svg.replace(/class="/g, 'className="');
svg = svg.replace(/stroke-width=/g, 'strokeWidth=');
svg = svg.replace(/stroke-linecap=/g, 'strokeLinecap=');
svg = svg.replace(/stroke-linejoin=/g, 'strokeLinejoin=');
svg = svg.replace(/enable-background=/g, 'enableBackground=');
svg = svg.replace(/xml:space=/g, 'xmlSpace=');

// The SVG has multiple states grouped under <a> tags.
// E.g. <a className="estado to"><path .../><text>TO</text></a>
svg = svg.replace(/<a\s+className="estado\s+([a-z]{2})">([\s\S]*?)<\/a>/g, (match, uf, inner) => {
  
  // Replace '<path ... fill=...> with dynamic fill base on 'uf'
  // But wait, the SVG provided doesn't have a fill attribute, the state fills are normally done in CSS.
  // We'll inject our own fill attribute directly into the path.
  let content = inner;

  // Add the fill and class properties to paths.
  content = content.replace(/<path\s+([^>]+)><\/path>/g, (pathMatch, pathContent) => {
    return `<path ${pathContent} fill={activeUF === '${uf}' ? 'var(--color-primary)' : '#e2e8f0'} className={activeUF === '${uf}' ? 'transition-all duration-500 scale-[1.01] origin-center' : 'transition-all duration-500'} stroke="#ffffff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"></path>`;
  });
  
  // Do the same for paths with class="circle", though they also don't have fill in the raw svg
  content = content.replace(/<path\s+className="circle"\s+([^>]+)><\/path>/g, (pathMatch, pathContent) => {
    return `<path className="circle" ${pathContent} fill={activeUF === '${uf}' ? '#061d3e' : '#cbd5e1'}></path>`;
  });
  
  // We change the text colors as well for clarity. If active, white text, else grayish Text
  content = content.replace(/<text([^>]*)fill="#FFFFFF"([^>]*)>([^<]*)<\/text>/g, `<text$1fill={activeUF === '${uf}' ? '#ffffff' : '#64748b'}$2 style={{fontSize: '11px', fontWeight: 'bold'}}>$3</text>`);

  return `<g id="state-${uf}" style={{ cursor: 'pointer' }}>\n${content}\n</g>`;
});


const fileContent = `
'use client';
import { useDeputado } from '@/context/DeputadoContext';
import { useEffect, useState } from 'react';

const stateNameToUF: Record<string, string> = {
  'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM', 'Bahia': 'BA', 'Ceará': 'CE',
  'Distrito Federal': 'DF', 'Espírito Santo': 'ES', 'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT',
  'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
  'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
  'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO'
};

export function StateMap() {
  const { selectedDeputado } = useDeputado();
  const [activeUF, setActiveUF] = useState('');

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
  }, [selectedDeputado]);

  return (
    <div className="w-full h-full min-h-[500px] flex items-center justify-center relative p-8 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden">
      ${svg}

      {/* Legend / Info */}
      <div className="absolute bottom-6 right-6 bg-white pl-4 pr-6 py-4 rounded-xl shadow-md border border-slate-100">
        <h4 className="font-bold text-slate-700 mb-3 uppercase tracking-widest text-[10px]">Legenda do Mapa</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-md shadow-sm border border-black/5" style={{ backgroundColor: 'var(--color-primary)' }}></div>
            <span className="text-slate-600 text-xs font-semibold">Estado de atuação do deputado</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-slate-200 rounded-md border border-slate-300 shadow-sm"></div>
            <span className="text-slate-600 text-xs font-medium">Demais estados</span>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('components/StateMap.tsx', fileContent);
console.log('StateMap.tsx generated successfully!');
