'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useDeputado } from '@/context/DeputadoContext';
import Link from 'next/link';
import { FileText, Receipt, Search } from 'lucide-react';

function BuscaContent() {
  const searchParams = useSearchParams();
  const q = searchParams?.get('q') || '';
  const { selectedDeputado } = useDeputado();
  
  const [emendas, setEmendas] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function performSearch() {
      if (!selectedDeputado || !q.trim()) {
        setEmendas([]);
        setProjetos([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      // Search Emendas
      const { data: emendasData } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('id_deputado', selectedDeputado.id)
        .ilike('objeto', `%${q}%`);

      if (emendasData) setEmendas(emendasData);

      // Search Projetos
      const { data: projetosData } = await supabase
        .from('projetos')
        .select('*')
        .eq('id_deputado', selectedDeputado.id)
        .ilike('descricao', `%${q}%`);

      if (projetosData) setProjetos(projetosData);

      setLoading(false);
    }

    performSearch();
  }, [q, selectedDeputado]);

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div>
        <p className="text-sm font-bold text-primary uppercase tracking-widest mb-1">Resultados da Busca</p>
        <h2 className="text-2xl md:text-3xl font-black font-headline text-on-surface flex items-center gap-2">
          <Search size={28} />
          &quot;{q}&quot;
        </h2>
      </div>

      {loading ? (
        <div className="text-slate-500">Buscando...</div>
      ) : (
        <div className="space-y-8">
          {/* Emendas Results */}
          <section>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
              <Receipt size={20} />
              Emendas ({emendas.length})
            </h3>
            {emendas.length === 0 ? (
              <p className="text-slate-500 text-sm">Nenhuma emenda encontrada.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {emendas.map(emenda => (
                  <Link key={emenda.id} href={`/emendas/${emenda.id}/editar`} className="block bg-white p-4 rounded-xl border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all">
                    <p className="text-xs text-slate-500 mb-1">{new Date(emenda.data).toLocaleDateString('pt-BR')}</p>
                    <h4 className="font-bold text-slate-800 mb-2 line-clamp-2">{emenda.objeto}</h4>
                    <p className="text-primary font-bold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(emenda.valor)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Projetos Results */}
          <section>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
              <FileText size={20} />
              Projetos ({projetos.length})
            </h3>
            {projetos.length === 0 ? (
              <p className="text-slate-500 text-sm">Nenhum projeto encontrado.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projetos.map(projeto => (
                  <Link key={projeto.id} href={`/projetos/${projeto.id}/editar`} className="block bg-white p-4 rounded-xl border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all">
                    <p className="text-xs text-slate-500 mb-1">{new Date(projeto.data).toLocaleDateString('pt-BR')}</p>
                    <h4 className="font-bold text-slate-800 mb-2 line-clamp-2">{projeto.descricao}</h4>
                    <p className="text-sm text-slate-600 line-clamp-2">{projeto.justificativa}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default function BuscaPage() {
  return (
    <Suspense fallback={<div className="p-8">Carregando...</div>}>
      <BuscaContent />
    </Suspense>
  );
}
