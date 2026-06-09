const fs = require('fs');

let svg = fs.readFileSync('portal_svg.txt', 'utf8');

// Basic JSX replacements
svg = svg.replace(/<svg /, '<svg className="max-w-2xl w-full h-auto mx-auto drop-shadow-md" ');
svg = svg.replace(/class="/g, 'className="');
svg = svg.replace(/stroke-width="/g, 'strokeWidth="');
svg = svg.replace(/stroke-linecap="/g, 'strokeLinecap="');
svg = svg.replace(/stroke-linejoin="/g, 'strokeLinejoin="');
svg = svg.replace(/enable-background="/g, 'enableBackground="');
svg = svg.replace(/xml:space="/g, 'xmlSpace="');

// The SVG has multiple states grouped under <a> tags.
svg = svg.replace(/<a\s+className="estado\s+([a-z]{2})">([\s\S]*?)<\/a>/g, (match, uf, inner) => {
  let content = inner;

  content = content.replace(/<path\s+([^>]+)><\/path>/g, (pathMatch, pathContent) => {
    // We append the new stroke and fill. We strip out any old stroke properties if needed,
    // but the regex leaves them untouched for now.
    // The SVGs generally have: stroke="#FFFFFF" strokeWidth="1.0404" etc.
    let cleaned = pathContent.replace(/stroke="[^"]*"/g, '').replace(/strokeWidth="[^"]*"/g, '').replace(/strokeLinecap="[^"]*"/g, '').replace(/strokeLinejoin="[^"]*"/g, '');
    
    return `<path ${cleaned} fill={activeUF === '${uf}' ? 'var(--color-primary)' : '#e2e8f0'} className={activeUF === '${uf}' ? 'transition-all duration-500 transform scale-[1.01] origin-center z-10' : 'transition-colors duration-300 hover:opacity-80 cursor-pointer'} stroke="var(--color-background)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>`;
  });
  
  content = content.replace(/<path([^>]*)className="circle"([^>]*)><\/path>/g, (pathMatch, p1, p2) => {
    return `<path className="circle" ${p1} ${p2} fill={activeUF === '${uf}' ? '#061d3e' : '#cbd5e1'}></path>`;
  });
  
  content = content.replace(/<text([^>]*)fill="#FFFFFF"([^>]*)>([^<]*)<\/text>/g, (textMatch, p1, p2, textContent) => {
    return `<text ${p1} fill={activeUF === '${uf}' ? '#ffffff' : '#64748b'} ${p2} style={{fontSize: '11px', fontWeight: 'bold'}}>${textContent}</text>`;
  });

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
    <div className="w-full h-full min-h-[500px] flex items-center justify-center relative p-8 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shadow-inner">
      ${svg}

      {/* Legend / Info */}
      <div className="absolute bottom-6 right-6 bg-white pl-4 pr-6 py-4 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100">
        <h4 className="font-bold text-slate-700 mb-3 uppercase tracking-widest text-[10px]">Legenda do Mapa</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-md shadow-sm border border-black/5" style={{ backgroundColor: 'var(--color-primary)' }}></div>
            <span className="text-slate-600 text-xs font-semibold">Estado de atuação do deputado</span>
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
console.log('StateMap.tsx updated successfully');
