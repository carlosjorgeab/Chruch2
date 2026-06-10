'use client';
import { useIgreja } from '@/context/IgrejaContext';

export default function FinanceiroPage() {
  const { selectedIgreja } = useIgreja();

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Controle Financeiro</h2>
          <p className="text-slate-500 text-sm">Dízimos, Ofertas e Despesas da {selectedIgreja?.nome || 'igreja'}</p>
        </div>
        <button className="bg-amber-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-amber-700 transition">
          + Novo Lançamento
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm p-8 text-center text-slate-500">
        Módulo Financeiro em desenvolvimento...
      </div>
    </div>
  );
}
