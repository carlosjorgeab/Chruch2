'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

export default function HistoricoEmendaPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const emendaId = resolvedParams.id;
  const router = useRouter();

  const [emenda, setEmenda] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    status: 'Proposição',
    data: new Date().toISOString().split('T')[0],
    valor: 0,
    valor_formatted: ''
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
      setLoading(true);
      // Fetch Emenda
      const { data: emendaData } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('id', emendaId)
        .single();
      
      if (emendaData) setEmenda(emendaData);

      // Fetch Historico
      const { data: historicoData } = await supabase
        .from('historico_emendas')
        .select('*')
        .eq('id_emenda', emendaId)
        .order('data', { ascending: false });
      
      if (historicoData) setHistorico(historicoData);
      setLoading(false);
    }
    fetchData();
  }, [emendaId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    const payload = {
      id_emenda: emendaId,
      status: formData.status,
      data: formData.data,
      valor: formData.valor
    };

    const { error } = await supabase.from('historico_emendas').insert([payload]);
    
    if (!error) {
      // Refresh list
      const { data: historicoData } = await supabase
        .from('historico_emendas')
        .select('*')
        .eq('id_emenda', emendaId)
        .order('data', { ascending: false });
      if (historicoData) setHistorico(historicoData);
      
      // Reset form
      setFormData({
        status: 'Proposição',
        data: new Date().toISOString().split('T')[0],
        valor: 0,
        valor_formatted: ''
      });
    } else {
      alert('Erro ao salvar histórico');
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
      await supabase.from('historico_emendas').delete().eq('id', id);
      setHistorico(historico.filter(h => h.id !== id));
    }
  }

  if (loading) return <div className="p-8">Carregando...</div>;
  if (!emenda) return <div className="p-8">Emenda não encontrada.</div>;

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/emendas" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <div>
          <p className="text-sm font-bold text-primary uppercase tracking-widest mb-1">Emendas</p>
          <h2 className="text-3xl font-black font-headline text-on-surface">Histórico da Emenda</h2>
          <p className="text-on-surface-variant text-sm mt-1">
            <strong>Objeto:</strong> {emenda.objeto} | <strong>Beneficiário:</strong> {emenda.beneficiario}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6 sticky top-8">
            <h3 className="font-bold text-lg text-on-surface border-b pb-2">Novo Lançamento</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Status</label>
                <select 
                  required
                  className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all appearance-none"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="Proposição">Proposição</option>
                  <option value="Aprovação">Aprovação</option>
                  <option value="Empenho">Empenho</option>
                  <option value="Pagamento">Pagamento</option>
                  <option value="Liquidação">Liquidação</option>
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
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Valor (R$)</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all"
                  value={formData.valor_formatted}
                  onChange={handleCurrencyChange}
                  placeholder="R$ 0,00"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-container text-white px-8 py-3 rounded-lg text-sm font-bold hover:opacity-90 transition-all shadow-md disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Salvando...' : 'Adicionar ao Histórico'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-surface-container-low">
              <h3 className="font-bold text-lg text-on-surface">Lançamentos Registrados</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-4 text-[10px] uppercase font-black text-on-surface-variant tracking-wider">Data</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-black text-on-surface-variant tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-black text-on-surface-variant tracking-wider">Valor</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-black text-on-surface-variant tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {historico.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Nenhum lançamento registrado.</td></tr>
                  ) : (
                    historico.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm text-on-surface font-medium">
                            {new Date(item.data).toLocaleDateString('pt-BR')}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-full uppercase">
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-sm text-on-surface">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50" title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
