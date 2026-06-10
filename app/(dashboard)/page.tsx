'use client';
import { Users, UsersRound, Wallet, BookOpen } from 'lucide-react';
import { useIgreja } from '@/context/IgrejaContext';

export default function Home() {
  const { selectedIgreja } = useIgreja();

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-1">Painel Principal</p>
          <h2 className="text-2xl md:text-3xl font-black font-headline text-slate-900 dark:text-white">
            {selectedIgreja ? selectedIgreja.nome : 'Carregando...'}
          </h2>
          <p className="text-slate-500 text-sm">Resumo e estatísticas da congregação</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Membros Ativos</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">124</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
            <UsersRound size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Comunidades / Células</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">8</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Aulas da EBD</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">12</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Entradas (Mês)</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">R$ 4.250</p>
          </div>
        </div>
      </div>

    </div>
  );
}
