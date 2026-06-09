'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

type FilterState = {
  anosFiscais: number[];
  tipoVerba: string;
  categoria: string;
  municipio: string;
};

type FilterContextType = {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  resetFilters: () => void;
};

const defaultFilters: FilterState = {
  anosFiscais: [],
  tipoVerba: 'Todas',
  categoria: 'Todas',
  municipio: 'Todos',
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const resetFilters = () => setFilters(defaultFilters);

  return (
    <FilterContext.Provider value={{ filters, setFilters, resetFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
