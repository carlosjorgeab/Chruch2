'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useDeputado } from '@/context/DeputadoContext';
import { useFilters } from '@/context/FilterContext';
import { Search } from 'lucide-react';

export function EmendasTable() {
  const { selectedDeputado } = useDeputado();
  const { filters } = useFilters();
  const [emendas, setEmendas] = useState<any[]>([]);
  const [filteredEmendas, setFilteredEmendas] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch all emendas for this deputy
  const fetchEmendas = async () => {
    if (!selectedDeputado) {
      setEmendas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orcamentos')
        .select(`
          *,
          areas_tematicas(nome),
          projetos(descricao, ementa)
        `)
        .eq('id_deputado', selectedDeputado.id)
        .eq('etapa', 'Liberado');

      if (error) {
        console.error('Error fetching emendas for list:', error);
      } else if (data) {
        setEmendas(data);
      }
    } catch (err) {
      console.error('Exception fetching emendas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmendas();
  }, [selectedDeputado]);

  // Apply search input filter
  useEffect(() => {
    let result = [...emendas];

    // Filter by user search term
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(e => 
        (e.objeto && e.objeto.toLowerCase().includes(term)) ||
        (e.beneficiario && e.beneficiario.toLowerCase().includes(term)) ||
        (e.autor && e.autor.toLowerCase().includes(term)) ||
        (e.tipo && e.tipo.toLowerCase().includes(term)) ||
        (e.municipio && e.municipio.toLowerCase().includes(term)) ||
        (e.areas_tematicas?.nome && e.areas_tematicas.nome.toLowerCase().includes(term))
      );
    }

    setFilteredEmendas(result);
  }, [emendas, searchTerm]);

  // Handle single deletion
  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta emenda?')) {
      try {
        const { error } = await supabase.from('orcamentos').delete().eq('id', id);
        if (error) {
          alert('Erro ao excluir emenda: ' + error.message);
        } else {
          // Refresh list
          fetchEmendas();
        }
      } catch (err) {
        console.error('Error deleting emenda:', err);
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <section className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100" id="emendas-dashboard-list">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-headline font-black text-slate-800">Relação de Emendas Parlamentares</h3>
          <p className="text-xs text-slate-500">Listagem filtrada com base nas seleções do painel</p>
        </div>
        
        <div className="relative flex items-center bg-slate-50 rounded-lg px-4 py-2 w-full sm:w-80 border border-slate-200">
          <Search className="text-slate-400 shrink-0" size={16} />
          <input 
            className="bg-transparent border-none focus:ring-0 text-sm w-full font-body placeholder:text-slate-400 ml-2 outline-none" 
            placeholder="Buscar por objeto, beneficiário..." 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-wider">Data</th>
              <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-wider">Objeto / Beneficiário</th>
              <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-wider">Município</th>
              <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-wider">Tipo / Categoria</th>
              <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-wider">Projeto Vinculado</th>
              <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-wider">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                  Carregando emendas...
                </td>
              </tr>
            ) : !selectedDeputado ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                  Selecione um deputado no topo da página.
                </td>
              </tr>
            ) : filteredEmendas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                  Nenhuma emenda para exibir com os filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredEmendas.map((emenda) => (
                <tr key={emenda.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs text-slate-600 font-mono">
                      {emenda.data ? new Date(emenda.data).toLocaleDateString('pt-BR') : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-sm">
                    <p className="font-bold text-sm text-slate-800 line-clamp-1">{emenda.objeto}</p>
                    <p className="text-xs text-slate-500">Beneficiário: <span className="font-medium">{emenda.beneficiario || 'Não informado'}</span></p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-slate-750">
                      {emenda.municipio || 'Estadual'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-650 text-[10px] font-bold rounded uppercase">
                        {emenda.tipo}
                      </span>
                      {emenda.areas_tematicas?.nome && (
                        <span className="text-[11px] text-primary font-medium">
                          {emenda.areas_tematicas.nome}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    {emenda.projetos ? (
                      <div>
                        <p className="text-xs font-bold text-slate-700 line-clamp-1">{emenda.projetos.descricao}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{emenda.projetos.ementa || '-'}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Sem vínculo</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-sm text-slate-900">
                      {formatCurrency(Number(emenda.valor) || 0)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
