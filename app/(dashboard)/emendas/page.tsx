'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, Search, History, FileText } from 'lucide-react';
import Link from 'next/link';
import { useDeputado } from '@/context/DeputadoContext';

export default function EmendasPage() {
  const { selectedDeputado } = useDeputado();
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchOrcamentos() {
      if (!selectedDeputado) {
        if (isMounted) {
          setOrcamentos([]);
          setLoading(false);
        }
        return;
      }
      if (isMounted) setLoading(true);
      const { data, error } = await supabase
        .from('orcamentos')
        .select('*, projetos(descricao)')
        .eq('id_deputado', selectedDeputado.id);
      
      if (isMounted) {
        if (data) setOrcamentos(data);
        setLoading(false);
      }
    }

    // Use setTimeout to defer the synchronous state update
    const timeoutId = setTimeout(() => {
      fetchOrcamentos();
    }, 0);

    return () => { 
      isMounted = false; 
      clearTimeout(timeoutId);
    };
  }, [selectedDeputado]);

  async function handleDelete(id: string) {
    if (confirm('Tem certeza que deseja excluir esta emenda?')) {
      await supabase.from('orcamentos').delete().eq('id', id);
      if (selectedDeputado) {
        setLoading(true);
        const { data } = await supabase
          .from('orcamentos')
          .select('*, projetos(descricao)')
          .eq('id_deputado', selectedDeputado.id);
        if (data) setOrcamentos(data);
        setLoading(false);
      }
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-sm font-bold text-primary uppercase tracking-widest mb-1">Gestão Financeira</p>
          <h2 className="text-2xl md:text-3xl font-black font-headline text-on-surface">Minhas Emendas</h2>
          <p className="text-on-surface-variant text-sm">Acompanhamento de emendas e orçamentos destinados</p>
        </div>
        <Link href="/emendas/nova" className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all shadow-md w-full md:w-auto">
          <Plus size={18} />
          Nova Emenda
        </Link>
      </div>

      <section className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
        <div className="p-6 border-b border-surface-container-low flex justify-between items-center">
          <div className="relative flex items-center bg-slate-50 rounded-lg px-4 py-2 w-80 border border-slate-200">
            <Search className="text-slate-400" size={16} />
            <input 
              className="bg-transparent border-none focus:ring-0 text-sm w-full font-body placeholder:text-slate-400 ml-2 outline-none" 
              placeholder="Buscar emendas..." 
              type="text" 
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-[10px] uppercase font-black text-on-surface-variant tracking-wider">Data</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-on-surface-variant tracking-wider">Objeto</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-on-surface-variant tracking-wider">Município</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-on-surface-variant tracking-wider">Beneficiário</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-on-surface-variant tracking-wider">Autor</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-on-surface-variant tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-on-surface-variant tracking-wider">Projeto Vinculado</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-on-surface-variant tracking-wider">Valor</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black text-on-surface-variant tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {loading ? (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-slate-500">Carregando...</td></tr>
              ) : !selectedDeputado ? (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-slate-500">Selecione um deputado para ver as emendas.</td></tr>
              ) : orcamentos.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-slate-500">Nenhuma emenda encontrada.</td></tr>
              ) : (
                orcamentos.map(orcamento => (
                  <tr key={orcamento.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm text-on-surface font-medium">
                        {new Date(orcamento.data).toLocaleDateString('pt-BR')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-sm text-on-surface">{orcamento.objeto}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-on-surface">{orcamento.municipio || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-on-surface">{orcamento.beneficiario || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-on-surface">{orcamento.autor || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-full uppercase">
                        {orcamento.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-on-surface">{orcamento.projetos?.descricao || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-sm text-on-surface">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.valor)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/emendas/${orcamento.id}/historico`} className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-blue-50" title="Histórico">
                          <History size={16} />
                        </Link>
                        <Link href={`/emendas/${orcamento.id}/editar`} className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-red-50" title="Editar">
                          <Edit size={16} />
                        </Link>
                        <button onClick={() => handleDelete(orcamento.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50" title="Excluir">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
