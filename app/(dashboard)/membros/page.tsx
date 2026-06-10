'use client';
import { useIgreja } from '@/context/IgrejaContext';

export default function MembrosPage() {
  const { selectedIgreja } = useIgreja();

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Membros</h2>
          <p className="text-slate-500 text-sm">Gestão de membros da {selectedIgreja?.nome || 'igreja'}</p>
        </div>
        <button className="bg-amber-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-amber-700 transition">
          + Novo Membro
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider">Nome</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider">Telefone</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {/* Placeholder rows */}
            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-6 py-4 font-medium">João Batista</td>
              <td className="px-6 py-4 text-slate-500">joao@email.com</td>
              <td className="px-6 py-4 text-slate-500">(11) 9999-9999</td>
              <td className="px-6 py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Ativo</span></td>
              <td className="px-6 py-4 text-right">
                <button className="text-amber-600 hover:text-amber-700 font-semibold mr-3">Editar</button>
                <button className="text-red-500 hover:text-red-600 font-semibold">Excluir</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
