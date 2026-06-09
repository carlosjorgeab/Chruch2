'use client';
import { useState, useEffect } from 'react';
import { useDeputado } from '@/context/DeputadoContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, FileText, Calendar, Building, Info } from 'lucide-react';
import Link from 'next/link';

export default function ProjetosAreaPage() {
  const { selectedDeputado } = useDeputado();
  const router = useRouter();
  const params = useParams();
  const areaId = (params?.areaId as string) || '';
  
  const [area, setArea] = useState<any>(null);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!selectedDeputado || !areaId) return;
      
      setLoading(true);
      
      // Fetch area details
      const { data: areaData } = await supabase
        .from('areas_tematicas')
        .select('*')
        .eq('id', areaId)
        .single();
        
      if (areaData) {
        setArea(areaData);
      }
      
      // Fetch projects for this area and deputado
      const { data: projetosData, error } = await supabase
        .from('projetos')
        .select('*')
        .eq('id_deputado', selectedDeputado.id)
        .eq('id_area_tematica', areaId)
        .eq('etapa', 'Liberado')
        .order('numero_proposicao', { ascending: false });

      if (projetosData && !error) {
        setProjetos(projetosData);
      }
      
      setLoading(false);
    }
    
    fetchData();
  }, [selectedDeputado, areaId]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-primary, #005baa)' }}></div>
      </div>
    );
  }

  const backUrl = `/p/${selectedDeputado?.slug || selectedDeputado?.id}/projetos`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link 
        href={backUrl}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors mb-8 uppercase tracking-widest"
      >
        <ArrowLeft size={16} />
        Voltar para Áreas
      </Link>

      {area && (
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center p-2.5 bg-slate-50 dark:bg-slate-900 shadow-sm"
            style={{ 
              borderColor: (area.cor || 'var(--color-primary)') + '44', 
              borderWidth: '2px', 
              borderStyle: 'solid'
            }}
          >
            {area.icone_url ? (
              area.icone_url.startsWith('<svg') ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: area.icone_url }} 
                  className="w-full h-full flex items-center justify-center" 
                  style={{ color: area.cor || 'var(--color-primary)' }} 
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={area.icone_url} alt={area.nome} className="w-full h-full object-contain" />
              )
            ) : (
               <div className="w-6 h-6 rounded-full" style={{ backgroundColor: area.cor || 'var(--color-primary)' }} />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase text-slate-900 dark:text-white tracking-tight leading-none bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${area.cor || 'var(--color-primary)'}, #334155)`}}>
              {area.nome}
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">{projetos.length} {projetos.length === 1 ? 'Projeto' : 'Projetos'} Encontrados</p>
          </div>
        </div>
      )}

      {projetos.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
            <Info size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Nenhum projeto a exibir</h3>
          <p className="text-slate-500">Ainda não há projetos cadastrados para esta área temática.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {projetos.map((projeto) => (
            <div 
              key={projeto.id} 
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 border-l-4 shadow-sm hover:shadow-md transition-shadow border-y border-r border-y-slate-200 border-r-slate-200 dark:border-y-slate-800 dark:border-r-slate-800 relative overflow-hidden" 
              style={{ borderLeftColor: area?.cor || 'var(--color-primary)' }}
            >
              <div 
                className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none transform translate-x-8 -translate-y-8"
                style={{ backgroundColor: area?.cor || 'var(--color-primary)', borderRadius: '50%' }}
              />
              
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 relative">
                <div>
                  {projeto.numero_proposicao ? (
                    projeto.url_legislativo ? (
                      <a 
                        href={projeto.url_legislativo} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mb-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
                        style={{ color: area?.cor || 'var(--color-primary)' }}
                      >
                        Nº {projeto.numero_proposicao}
                        <ExternalLink size={14} className="opacity-70" />
                      </a>
                    ) : (
                      <div className="inline-flex items-center gap-2 mb-3 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                        Nº {projeto.numero_proposicao}
                      </div>
                    )
                  ) : (
                    <div className="inline-flex items-center gap-2 mb-3 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider border border-slate-100 dark:border-slate-800">
                      Sem Número de Proposição
                    </div>
                  )}
                  
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                    {projeto.descricao}
                  </h3>
                </div>
              </div>

              {projeto.ementa && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 mb-6 border border-slate-100 dark:border-slate-800 relative">
                  <FileText size={16} className="absolute top-5 left-5 text-slate-400" />
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-8">
                    {projeto.ementa}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-slate-500 uppercase tracking-widest pt-4 border-t border-slate-100 dark:border-slate-800">
                {projeto.tipo && (
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                    <span>{projeto.tipo}</span>
                  </div>
                )}
                {projeto.autor && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Autor:</span>
                    <span className="text-slate-700 dark:text-slate-300">{projeto.autor}</span>
                  </div>
                )}
                {projeto.data && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Calendar size={14} className="text-slate-400" />
                    <span>{new Date(projeto.data).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
