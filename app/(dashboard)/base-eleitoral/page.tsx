'use client';
import { useDeputado } from '@/context/DeputadoContext';
import { MapPin } from 'lucide-react';

export default function BaseEleitoralPage() {
  const { selectedDeputado } = useDeputado();

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-sm font-bold text-primary uppercase tracking-widest mb-1">Território</p>
          <h2 className="text-3xl font-black font-headline text-on-surface">Base Eleitoral</h2>
          <p className="text-on-surface-variant text-sm">Acompanhamento de municípios e lideranças</p>
        </div>
      </div>

      <section className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 p-16 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <MapPin size={32} className="text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-on-surface mb-2">Módulo em Desenvolvimento</h3>
        <p className="text-slate-500 max-w-md">
          A visualização do mapa interativo e o cadastro de lideranças por município estarão disponíveis na próxima atualização do sistema.
        </p>
      </section>
    </div>
  );
}
