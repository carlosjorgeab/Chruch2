'use client';
import { useDeputado } from '@/context/DeputadoContext';
import { FileText, Download } from 'lucide-react';

export default function RelatoriosPage() {
  const { selectedDeputado } = useDeputado();

  const relatorios = [
    { id: 1, titulo: 'Relatório de Execução Orçamentária', data: '15/05/2024', tipo: 'PDF' },
    { id: 2, titulo: 'Balanço de Projetos por Município', data: '01/05/2024', tipo: 'XLSX' },
    { id: 3, titulo: 'Análise de Impacto Social', data: '10/04/2024', tipo: 'PDF' },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-sm font-bold text-primary uppercase tracking-widest mb-1">Transparência</p>
          <h2 className="text-3xl font-black font-headline text-on-surface">Relatórios</h2>
          <p className="text-on-surface-variant text-sm">Documentos e prestações de contas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {relatorios.map(rel => (
          <div key={rel.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col h-full">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 text-primary">
              <FileText size={24} />
            </div>
            <h3 className="font-bold text-on-surface mb-2 flex-grow">{rel.titulo}</h3>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">Gerado em {rel.data}</span>
              <button className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                <Download size={14} />
                Baixar {rel.tipo}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
