'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useDeputado } from '@/context/DeputadoContext';
import { use } from 'react';

export default function EmendaForm({ id }: { id?: string } = {}) {
  const router = useRouter();
  const resolvedParams = { id };
  const isEditing = !!id;
  const { selectedDeputado } = useDeputado();
  
  const [projetos, setProjetos] = useState<any[]>([]);
  const [municipios, setMunicipios] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    tipo: 'Individuais (RP 6)',
    objeto: '',
    beneficiario: '',
    municipio: '',
    autor: '',
    valor: 0,
    valor_formatted: '',
    id_projeto: '',
    id_area_tematica: '',
    etapa: 'Liberado'
  });

  const formatCurrency = (value: string | number) => {
    const stringValue = String(value).replace(/\D/g, '');
    const amount = Number(stringValue) / 100;
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    const numericValue = Number(e.target.value.replace(/\D/g, '')) / 100;
    setFormData({ ...formData, valor_formatted: formatted, valor: numericValue });
  };

  useEffect(() => {
    async function fetchData() {
      if (!selectedDeputado) return;

      const { data: areasData } = await supabase.from('areas_tematicas').select('*');
      if (areasData) setAreas(areasData);

      const { data: projetosData } = await supabase
        .from('projetos')
        .select('*')
        .eq('id_deputado', selectedDeputado.id);
      if (projetosData) setProjetos(projetosData);

      const { data: municipiosData } = await supabase
        .from('municipio')
        .select('*, unidade_federacao!inner(sigla)')
        .eq('unidade_federacao.sigla', selectedDeputado.estado)
        .order('nome');
      if (municipiosData) setMunicipios(municipiosData);

      if (isEditing) {
        const { data: orcamentoData } = await supabase.from('orcamentos').select('*').eq('id', resolvedParams.id).single();
        if (orcamentoData) {
          setFormData({
            data: orcamentoData.data,
            tipo: orcamentoData.tipo || 'Individuais (RP 6)',
            objeto: orcamentoData.objeto || '',
            beneficiario: orcamentoData.beneficiario || '',
            municipio: orcamentoData.municipio || '',
            autor: orcamentoData.autor || '',
            valor: orcamentoData.valor,
            valor_formatted: formatCurrency(orcamentoData.valor * 100),
            id_projeto: orcamentoData.id_projeto || '',
            id_area_tematica: orcamentoData.id_area_tematica || '',
            etapa: orcamentoData.etapa || 'Liberado'
          });
        }
        setFetching(false);
      } else {
        setFormData(prev => ({
          ...prev,
          autor: selectedDeputado?.nome || ''
        }));
        setFetching(false);
      }
    }
    fetchData();
  }, [isEditing, resolvedParams?.id, selectedDeputado]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDeputado) {
      alert('Selecione um deputado primeiro');
      return;
    }

    setLoading(true);
    
    const { valor_formatted, ...restFormData } = formData;
    const payload = {
      ...restFormData,
      id_deputado: selectedDeputado.id,
      id_projeto: formData.id_projeto || null,
      id_area_tematica: formData.id_area_tematica || null
    };

    if (isEditing) {
      const { error } = await supabase.from('orcamentos').update(payload).eq('id', resolvedParams.id);
      if (!error) router.push('/emendas');
      else alert('Erro ao atualizar emenda');
    } else {
      const { error } = await supabase.from('orcamentos').insert([payload]);
      if (!error) router.push('/emendas');
      else alert('Erro ao salvar emenda');
    }
    setLoading(false);
  }

  if (fetching) return <div className="p-8">Carregando...</div>;

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/emendas" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <div>
          <p className="text-sm font-bold text-primary uppercase tracking-widest mb-1">Emendas</p>
          <h2 className="text-3xl font-black font-headline text-on-surface">
            {isEditing ? 'Editar Emenda' : 'Nova Emenda'}
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2 space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Objeto</label>
            <input 
              required
              type="text" 
              className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all"
              value={formData.objeto}
              onChange={e => setFormData({...formData, objeto: e.target.value})}
              placeholder="Ex: Emenda para reforma..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Autor da Emenda</label>
            <input 
              required
              type="text" 
              className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all"
              value={formData.autor}
              onChange={e => setFormData({...formData, autor: e.target.value})}
              placeholder="Nome do autor"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Beneficiário</label>
            <input 
              required
              type="text" 
              className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all"
              value={formData.beneficiario}
              onChange={e => setFormData({...formData, beneficiario: e.target.value})}
              placeholder="Ex: Hospital Y..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Município da Emenda</label>
            <select 
              required
              className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all appearance-none"
              value={formData.municipio}
              onChange={e => setFormData({...formData, municipio: e.target.value})}
            >
              <option value="" disabled>Selecione um município</option>
              {municipios.map(mun => (
                <option key={mun.id} value={`${mun.nome} - ${mun.unidade_federacao?.sigla}`}>
                  {mun.nome} - {mun.unidade_federacao?.sigla}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Área Temática (Categoria)</label>
            <select 
              required
              className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all appearance-none"
              value={formData.id_area_tematica}
              onChange={e => setFormData({...formData, id_area_tematica: e.target.value})}
            >
              <option value="" disabled>Selecione uma área</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>{area.nome}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Data</label>
            <input 
              required
              type="date" 
              className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all"
              value={formData.data}
              onChange={e => setFormData({...formData, data: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Tipo</label>
            <select 
              required
              className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all appearance-none"
              value={formData.tipo}
              onChange={e => setFormData({...formData, tipo: e.target.value})}
            >
              <option value="Individuais (RP 6)">Individuais (RP 6)</option>
              <option value="De Bancada (RP 7)">De Bancada (RP 7)</option>
              <option value="De Comissão (RP 8)">De Comissão (RP 8)</option>
              <option value="De Relator (RP 9)">De Relator (RP 9)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Valor da Emenda (R$)</label>
            <input 
              required
              type="text" 
              className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all"
              value={formData.valor_formatted}
              onChange={handleCurrencyChange}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Projeto Vinculado (Opcional)</label>
            <select 
              className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all appearance-none"
              value={formData.id_projeto}
              onChange={e => setFormData({...formData, id_projeto: e.target.value})}
            >
              <option value="">Nenhum</option>
              {projetos.map(projeto => (
                <option key={projeto.id} value={projeto.id}>{projeto.descricao}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Etapa</label>
            <select 
              required
              className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all appearance-none"
              value={formData.etapa}
              onChange={e => setFormData({...formData, etapa: e.target.value})}
            >
              <option value="Rascunho">Rascunho</option>
              <option value="Liberado">Liberado</option>
            </select>
          </div>
        </div>

        <div className="pt-6 flex justify-end">
          <button 
            type="submit" 
            disabled={loading || !selectedDeputado}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-white px-8 py-3 rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-md disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? 'Salvando...' : 'Salvar Emenda'}
          </button>
        </div>
      </form>
    </div>
  );
}
