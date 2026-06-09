'use client';
import { useState, useEffect } from 'react';
import { useDeputado } from '@/context/DeputadoContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { AlertCircle, Folder, LayoutGrid, Tags } from 'lucide-react';

export default function ProjetosPublicPage() {
  const { selectedDeputado } = useDeputado();
  const router = useRouter();
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAreas() {
      if (!selectedDeputado) return;
      
      setLoading(true);
      // Fetch all projects for this deputado to extract unique areas
      const { data: projetosData, error } = await supabase
        .from('projetos')
        .select('id_area_tematica, areas_tematicas(id, nome, cor, icone_url)')
        .eq('id_deputado', selectedDeputado.id)
        .eq('etapa', 'Liberado'); // Only show published projects if there is an etapa field

      if (projetosData && !error) {
        // Extract unique areas
        const uniqueAreasMap = new Map();
        projetosData.forEach((p: any) => {
          const area = Array.isArray(p.areas_tematicas) ? p.areas_tematicas[0] : p.areas_tematicas;
          if (area && area.id) {
            if (!uniqueAreasMap.has(area.id)) {
              uniqueAreasMap.set(area.id, area);
            }
          }
        });
        
        const areasArray = Array.from(uniqueAreasMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
        setAreas(areasArray);
      }
      setLoading(false);
    }
    
    fetchAreas();
  }, [selectedDeputado]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-primary, #005baa)' }}></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm" style={{ color: 'var(--color-primary)' }}>
          <LayoutGrid size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase text-slate-900 dark:text-white tracking-tight">Projetos por Áreas Temáticas</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Selecione uma área temática para visualizar os projetos relacionados do Deputado {selectedDeputado?.nome}.</p>
        </div>
      </div>

      {areas.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
            <Folder size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Nenhum projeto encontrado</h3>
          <p className="text-slate-500 max-w-md mx-auto">Este deputado ainda não possui projetos cadastrados em nenhuma área temática pública.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {areas.map(area => (
            <button
              key={area.id}
              onClick={() => router.push(`/p/${selectedDeputado?.slug || selectedDeputado?.id}/projetos/${area.id}`)}
              className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl transition-all duration-300 hover:shadow-xl hover:scale-105 group relative overflow-hidden"
              title={area.nome}
            >
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300" 
                style={{ backgroundColor: area.cor || 'var(--color-primary)' }} 
              />
              
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center p-3 transition-transform duration-300 group-hover:scale-110 mb-4 bg-slate-50 dark:bg-slate-800 shadow-sm"
                style={{ 
                  borderColor: (area.cor || 'var(--color-primary)') + '33', 
                  borderWidth: '2px', 
                  borderStyle: 'solid'
                }}
              >
                {area.icone_url ? (
                  area.icone_url.startsWith('<svg') ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: area.icone_url }} 
                      className="w-8 h-8 flex items-center justify-center" 
                      style={{ color: area.cor || 'var(--color-primary)' }} 
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={area.icone_url} alt={area.nome} className="w-8 h-8 object-contain" />
                  )
                ) : (
                  <Tags size={28} style={{ color: area.cor || 'var(--color-primary)' }} />
                )}
              </div>
              
              <h3 className="text-sm font-bold text-center text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors line-clamp-2">
                {area.nome}
              </h3>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
