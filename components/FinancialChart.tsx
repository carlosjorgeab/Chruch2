'use client';

import React, { useState } from 'react';

type ChartDataItem = {
  data: string;
  Entrada: number;
  Saída: number;
};

export default function FinancialChart({ chartData = [] }: { chartData: ChartDataItem[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium italic">
        Sem dados para exibir o gráfico.
      </div>
    );
  }

  // Calculate maximum values and intervals
  const maxValRaw = Math.max(...chartData.map((d) => Math.max(d.Entrada, d.Saída)), 0);
  const maxVal = maxValRaw === 0 ? 100 : Math.ceil(maxValRaw * 1.15); // Add 15% padding at top

  // Spacing helper for grid lines (top to bottom)
  const gridLevels = [1, 2 / 3, 1 / 3, 0];

  return (
    <div className="relative w-full h-full flex flex-col font-sans select-none" id="financial-chart-container">
      {/* Chart Canvas Area */}
      <div className="relative flex-1 flex" id="financial-chart-canvas">
        {/* Y-Axis Labels */}
        <div className="w-14 sm:w-16 flex flex-col justify-between text-[10px] font-bold text-slate-400 pr-2 pb-6 pt-1 text-right" id="financial-chart-yaxis">
          {gridLevels.map((level, i) => {
            const val = maxVal * level;
            return (
              <span key={i} id={`yaxis-label-${i}`}>
                {val >= 1000 ? `R$ ${(val / 1000).toFixed(1)}k` : `R$ ${Math.round(val)}`}
              </span>
            );
          })}
        </div>

        {/* Display grid lines and columns */}
        <div className="flex-1 relative h-full" id="financial-chart-columns-wrapper">
          {/* Horizontal Grid Lines */}
          <div className="absolute inset-0 pb-6 pt-2 flex flex-col justify-between pointer-events-none" id="financial-chart-gridlines">
            {gridLevels.map((_, i) => (
              <div
                key={i}
                className="w-full border-t border-dashed border-slate-100 dark:border-slate-800"
                id={`gridline-${i}`}
              />
            ))}
          </div>

          {/* Columns container */}
          <div className="absolute inset-0 pb-6 pt-2 flex justify-around items-end z-10 px-1" id="financial-chart-bars-container">
            {chartData.map((item, idx) => {
              const entradaPercent = (item.Entrada / maxVal) * 100;
              const saidaPercent = (item.Saída / maxVal) * 100;

              return (
                <div
                  key={idx}
                  className="flex-1 max-w-[50px] sm:max-w-[70px] h-full flex flex-col justify-end items-center relative group"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  id={`chart-column-group-${idx}`}
                >
                  {/* Hover Backdrop Highlight */}
                  <div
                    className={`absolute inset-0 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl transition-all duration-250 -z-10 ${
                      hoveredIndex === idx ? 'opacity-100 scale-102' : 'opacity-0 scale-98 pointer-events-none'
                    }`}
                    id={`bar-backdrop-${idx}`}
                  />

                  {/* HTML Hover Tooltip */}
                  {hoveredIndex === idx && (
                    <div
                      className="absolute bottom-[102%] left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] sm:text-xs rounded-2xl p-3 shadow-xl z-30 flex flex-col gap-1 min-w-[120px] sm:min-w-[140px] animate-in fade-in zoom-in-95 duration-150 border border-slate-850 dark:border-slate-100"
                      style={{ transformOrigin: 'bottom center' }}
                      id={`chart-tooltip-bubble-${idx}`}
                    >
                      <div className="font-extrabold pb-1.5 border-b border-slate-800 dark:border-slate-150 block text-center" id={`tooltip-date-${idx}`}>
                        Dia {item.data}
                      </div>
                      <div className="flex justify-between gap-4 pt-1 items-center" id={`tooltip-entrada-row-${idx}`}>
                        <span className="flex items-center gap-1.5 font-semibold text-slate-400 dark:text-slate-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          Entradas:
                        </span>
                        <span className="font-extrabold text-green-500 dark:text-green-600">
                          R$ {item.Entrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 items-center" id={`tooltip-saida-row-${idx}`}>
                        <span className="flex items-center gap-1.5 font-semibold text-slate-400 dark:text-slate-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                          Saídas:
                        </span>
                        <span className="font-extrabold text-red-500">
                          R$ {item.Saída.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Dual Bars side-by-side */}
                  <div className="flex items-end gap-1 sm:gap-1.5 w-full justify-center px-1 sm:px-2 h-full pb-0.5" id={`bars-container-${idx}`}>
                    {/* Entrada Bar (Green) */}
                    <div
                      className="flex-1 bg-green-600 dark:bg-green-500 hover:bg-green-500 dark:hover:bg-green-400 rounded-t-[3px] sm:rounded-t-[4px] shadow-sm transition-all duration-500 ease-out"
                      style={{
                        height: item.Entrada > 0 ? `${Math.max(3, entradaPercent)}%` : '0%',
                      }}
                      id={`bar-entrada-${idx}`}
                    />
                    {/* Saida Bar (Red) */}
                    <div
                      className="flex-1 bg-red-500 dark:bg-red-500 hover:bg-red-400 dark:hover:bg-red-400 rounded-t-[3px] sm:rounded-t-[4px] shadow-sm transition-all duration-500 ease-out"
                      style={{
                        height: item.Saída > 0 ? `${Math.max(3, saidaPercent)}%` : '0%',
                      }}
                      id={`bar-saida-${idx}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-axis Labels */}
          <div className="absolute left-0 right-0 bottom-0 h-6 flex justify-around items-center border-t border-slate-100 dark:border-slate-800" id="financial-chart-xaxis">
            {chartData.map((item, idx) => (
              <span
                key={idx}
                className="flex-1 text-center text-[10px] font-bold text-slate-400"
                id={`xaxis-tick-${idx}`}
              >
                {item.data}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
