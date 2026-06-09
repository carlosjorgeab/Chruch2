'use client';

import { useState, useEffect } from 'react';
import { useDeputado } from '@/context/DeputadoContext';
import { useFilters } from '@/context/FilterContext';
import { supabase } from '@/lib/supabase';

export function Charts() {
  const { selectedDeputado } = useDeputado();
  const { filters } = useFilters();
  const [categories, setCategories] = useState<{ name: string; value: number; color: string }[]>([]);
  const [total, setTotal] = useState(0);
  
  const [monthlyData, setMonthlyData] = useState<{ month: string; empenhado: number; pago: number }[]>([
    { month: 'JAN', empenhado: 0, pago: 0 },
    { month: 'FEV', empenhado: 0, pago: 0 },
    { month: 'MAR', empenhado: 0, pago: 0 },
    { month: 'ABR', empenhado: 0, pago: 0 },
    { month: 'MAI', empenhado: 0, pago: 0 },
    { month: 'JUN', empenhado: 0, pago: 0 },
  ]);

  useEffect(() => {
    async function fetchChartData() {
      if (!selectedDeputado) return;

      // Fetch all areas tematicas to get their colors
      const { data: areasList } = await supabase.from('areas_tematicas').select('nome, cor');
      const areaColors: Record<string, string> = {};
      if (areasList) {
        areasList.forEach(a => {
          areaColors[a.nome] = a.cor || '#cbd5e1'; // fallback to slate-300
        });
      }

      let categoryTotals: Record<string, number> = {};
      let totalValue = 0;
      
      let emendaIds: string[] = [];



      if (filters.tipoVerba === 'Todas' || filters.tipoVerba === 'Emendas') {
        let query = supabase
          .from('orcamentos')
          .select('*, areas_tematicas(nome)')
          .eq('id_deputado', selectedDeputado.id)
          .eq('etapa', 'Liberado');
        
        const { data: emendas } = await query;
        if (emendas) {
          emendas.forEach(e => {
            const cat = (e as any).areas_tematicas?.nome || 'Outros';
            const y = e.data ? new Date(e.data).getFullYear() : new Date().getFullYear();

            const matchYear = filters.anosFiscais.length === 0 || filters.anosFiscais.includes(y);
            const matchMun = filters.municipio === 'Todos' || e.municipio === filters.municipio;
            const matchCat = filters.categoria === 'Todas' || filters.categoria === cat;

            if (matchYear && matchMun && matchCat) {
              categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(e.valor);
              totalValue += Number(e.valor);
              emendaIds.push(e.id);
            }
          });
        }
      }

      const defaultColors = ['#005baa', '#009b3a', '#fedf00', '#cbd5e1'];
      
      const formattedCategories = Object.entries(categoryTotals)
        .map(([name, value], index) => ({
          name,
          value,
          color: areaColors[name] || defaultColors[index % defaultColors.length]
        }))
        .sort((a, b) => b.value - a.value);

      setCategories(formattedCategories);
      setTotal(totalValue);

      // Fetch history for bar chart
      const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      const newMonthlyData = months.slice(0, 6).map(m => ({ month: m, empenhado: 0, pago: 0 }));



      if (emendaIds.length > 0) {
        const chunkSize = 200;
        for (let i = 0; i < emendaIds.length; i += chunkSize) {
          const chunk = emendaIds.slice(i, i + chunkSize);
          const { data: histEmendas } = await supabase
            .from('historico_emendas')
            .select('status, data, valor')
            .in('id_emenda', chunk)
            .in('status', ['Empenho', 'Pagamento']);
          
          if (histEmendas) {
            histEmendas.forEach(h => {
              const date = new Date(h.data);
              const monthIndex = date.getMonth();
              if (monthIndex < 6) {
                if (h.status === 'Empenho') newMonthlyData[monthIndex].empenhado += Number(h.valor);
                if (h.status === 'Pagamento') newMonthlyData[monthIndex].pago += Number(h.valor);
              }
            });
          }
        }
      }

      setMonthlyData(newMonthlyData);
    }

    fetchChartData();
  }, [selectedDeputado, filters]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  let currentOffset = 0;
  const circumference = 2 * Math.PI * 40;

  // Calculate max value for bar chart scaling
  const maxMonthlyValue = Math.max(
    ...monthlyData.map(d => Math.max(d.empenhado, d.pago)),
    1 // prevent division by zero
  );

  return (
    <>
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex justify-between items-end mb-6 border-b border-slate-100 pb-4">
            <div className="flex gap-6">
              <h3 className="text-xl font-headline font-bold text-black dark:text-black">
                Histórico de Execução
              </h3>
            </div>
            
            <div className="flex gap-4 text-xs font-bold text-black dark:text-black">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-tertiary rounded-sm"></div>
                <span>Empenhado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-sm"></div>
                <span>Pago</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-h-[300px]">
            <div className="h-full flex items-end justify-between gap-4 px-2 pt-4">
              {monthlyData.map((data, index) => {
                const empenhadoPercent = (data.empenhado / maxMonthlyValue) * 100;
                const pagoPercent = (data.pago / maxMonthlyValue) * 100;
                
                return (
                  <div key={index} className="flex-1 flex flex-col justify-end gap-1 h-full">
                    <div className="w-full h-full flex items-end justify-center relative group">
                      {/* Empenhado Bar */}
                      <div 
                        className="absolute bottom-0 w-full bg-tertiary/40 rounded-t-sm transition-all"
                        style={{ height: `${Math.max(empenhadoPercent, 2)}%` }}
                        title={`Empenhado: ${formatCurrency(data.empenhado)}`}
                      ></div>
                      {/* Pago Bar */}
                      <div 
                        className="absolute bottom-0 w-full bg-primary rounded-t-sm transition-all"
                        style={{ height: `${Math.max(pagoPercent, 1)}%` }}
                        title={`Pago: ${formatCurrency(data.pago)}`}
                      ></div>
                    </div>
                    <span className="text-[10px] text-center font-bold text-black dark:text-black">{data.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
          <h4 className="text-xl font-headline font-bold text-black dark:text-black">Impacto Social</h4>
          <p className="text-sm text-black dark:text-black self-start mb-8">Foco por Área Temática</p>
          
          <div className="relative w-48 h-48 mb-8">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {categories.map((cat, i) => {
                const percentage = total > 0 ? cat.value / total : 0;
                
                // Calculate offset based on previous categories
                const previousPercentage = categories
                  .slice(0, i)
                  .reduce((sum, c) => sum + (total > 0 ? c.value / total : 0), 0);
                  
                const strokeDasharray = `${percentage * circumference} ${circumference}`;
                const strokeDashoffset = -(previousPercentage * circumference);
                
                return (
                  <circle 
                    key={cat.name}
                    cx="50" cy="50" fill="transparent" r="40" 
                    stroke={cat.color} 
                    strokeDasharray={strokeDasharray} 
                    strokeDashoffset={strokeDashoffset} 
                    strokeWidth="12"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black font-headline">{formatCurrency(total)}</span>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase">Total</span>
            </div>
          </div>
          
          <div className="w-full space-y-3">
            {categories.map(cat => (
              <div key={cat.name} className="flex justify-between items-center text-sm font-medium text-black dark:text-black">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                  <span className="text-black dark:text-black">{cat.name}</span>
                </div>
                <span className="font-bold text-black dark:text-black">{total > 0 ? Math.round((cat.value / total) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
