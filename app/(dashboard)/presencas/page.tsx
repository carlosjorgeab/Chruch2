'use client';
import { useIgreja } from '@/context/IgrejaContext';

export default function PresencasPage() {
  const { selectedIgreja } = useIgreja();

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Asistência / Presenças</h2>
          <p className="text-slate-500 text-sm">Controle de presenças da {selectedIgreja?.nome || 'igreja'}</p>
        </div>
        <button className="bg-amber-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-amber-700 transition">
          + Registrar Chamada
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm p-8 text-center text-slate-500">
        Módulo de Presenças em desenvolvimento...
      </div>
    </div>
  );
}
