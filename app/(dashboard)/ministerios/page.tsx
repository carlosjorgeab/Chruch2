'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Building2, User, Phone, MapPin, Trash2, Edit2, ChevronRight, Activity, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useDeputado } from '@/context/DeputadoContext';

interface Ministerio {
  id: string;
  nome: string;
  endereco: string;
  id_deputado: string;
}

interface Acao {
  id: string;
  id_ministerio: string;
  nome: string;
  descricao: string;
}

export default function MinisteriosPage() {
  const { selectedDeputado } = useDeputado();
  const [ministerios, setMinisterios] = useState<Ministerio[]>([]);
  const [acoes, setAcoes] = useState<Record<string, Acao[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAcaoModal, setShowAcaoModal] = useState(false);
  const [editingMinisterio, setEditingMinisterio] = useState<Ministerio | null>(null);
  const [selectedMinisterioId, setSelectedMinisterioId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    endereco: ''
  });

  const [acaoFormData, setAcaoFormData] = useState({
    nome: '',
    descricao: ''
  });

  useEffect(() => {
    if (selectedDeputado) {
      fetchData();
    }
  }, [selectedDeputado]);

  async function fetchData() {
    if (!selectedDeputado) return;
    setLoading(true);
    try {
      const { data: minData, error: minError } = await supabase
        .from('ministerios')
        .select('*')
        .eq('id_deputado', selectedDeputado.id)
        .order('nome');
      
      if (minError) {
        console.error('Error fetching ministerios:', minError);
      }
      
      if (minData) {
        setMinisterios(minData);
        
        // Fetch actions for each ministry
        const { data: acData, error: acError } = await supabase.from('acoes').select('*');
        if (acError) console.error('Error fetching acoes:', acError);
        
        if (acData) {
          const grouped: Record<string, Acao[]> = {};
          acData.forEach(ac => {
            if (!grouped[ac.id_ministerio]) grouped[ac.id_ministerio] = [];
            grouped[ac.id_ministerio].push(ac);
          });
          setAcoes(grouped);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMinisterio) {
        const { error } = await supabase.from('ministerios').update(formData).eq('id', editingMinisterio.id);
        if (error) {
          console.error('Update error:', error);
          alert(`Erro ao atualizar ministério: ${error.message}`);
          return;
        }
      } else {
        const { error } = await supabase.from('ministerios').insert([{
          ...formData,
          id_deputado: selectedDeputado?.id
        }]);
        if (error) {
          console.error('Insert error:', error);
          alert(`Erro ao criar ministério: ${error.message}`);
          return;
        }
      }
      setShowModal(false);
      setEditingMinisterio(null);
      setFormData({ nome: '', endereco: '' });
      fetchData();
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Ocorreu um erro inesperado ao salvar.');
    }
  };

  const handleAcaoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMinisterioId) return;
    
    const { error } = await supabase.from('acoes').insert([{
      ...acaoFormData,
      id_ministerio: selectedMinisterioId
    }]);
    
    if (error) {
      alert('Erro ao criar ação');
    } else {
      setShowAcaoModal(false);
      setAcaoFormData({ nome: '', descricao: '' });
      fetchData();
    }
  };

  const deleteMinisterio = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este ministério? Todas as ações vinculadas também serão excluídas.')) {
      await supabase.from('ministerios').delete().eq('id', id);
      fetchData();
    }
  };

  const deleteAcao = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta ação?')) {
      await supabase.from('acoes').delete().eq('id', id);
      fetchData();
    }
  };

  const filteredMinisterios = ministerios.filter(m => 
    m.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {!selectedDeputado && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-center gap-4 text-amber-800">
          <AlertCircle size={24} className="shrink-0" />
          <div>
            <p className="font-bold">Atenção</p>
            <p className="text-sm">Selecione um deputado na barra superior para gerenciar os ministérios vinculados.</p>
          </div>
        </div>
      )}

      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${!selectedDeputado ? 'opacity-50 pointer-events-none' : ''}`}>
        <div>
          <h2 className="text-3xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">
            Ministérios e Ações
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Gerencie o cadastro de ministérios e suas respectivas ações.</p>
        </div>
        <button 
          onClick={() => {
            setEditingMinisterio(null);
            setFormData({ nome: '', endereco: '' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 active:scale-95 uppercase text-xs tracking-widest"
        >
          <Plus size={18} />
          Novo Ministério
        </button>
      </div>

      <div className={`flex items-center bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-sm border border-slate-200 dark:border-slate-700 max-w-md ${!selectedDeputado ? 'opacity-50 pointer-events-none' : ''}`}>
        <Search className="text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar ministério..." 
          className="bg-transparent border-none focus:ring-0 w-full ml-2 text-slate-700 dark:text-slate-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={!selectedDeputado}
        />
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${!selectedDeputado ? 'opacity-50 pointer-events-none' : ''}`}>
        {loading && selectedDeputado ? (
          <div className="col-span-full py-20 text-center text-slate-500">Carregando ministérios...</div>
        ) : !selectedDeputado ? (
          <div className="col-span-full py-20 text-center text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            Selecione um deputado para visualizar os ministérios.
          </div>
        ) : filteredMinisterios.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            Nenhum ministério encontrado para este deputado.
          </div>
        ) : (
          filteredMinisterios.map(min => (
            <div key={min.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all flex flex-col gap-6 group">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl text-primary">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1">{min.nome}</h3>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                      <MapPin size={14} />
                      <span className="line-clamp-1 italic">{min.endereco || 'Endereço não informado'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingMinisterio(min);
                      setFormData({
                        nome: min.nome,
                        endereco: min.endereco || ''
                      });
                      setShowModal(true);
                    }}
                    className="p-2 text-slate-400 hover:text-primary hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => deleteMinisterio(min.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-2">
                <div className="flex items-center justify-between mb-4">
                   <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                     <Activity size={14} className="text-primary" />
                     Ações do Ministério
                   </h4>
                   <button 
                     onClick={() => {
                       setSelectedMinisterioId(min.id);
                       setShowAcaoModal(true);
                     }}
                     className="text-[10px] bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold transition-all uppercase tracking-widest border border-slate-200 dark:border-slate-700"
                   >
                     Adicionar Ação
                   </button>
                </div>

                <div className="space-y-2">
                  {!acoes[min.id] || acoes[min.id].length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Nenhuma ação cadastrada.</p>
                  ) : (
                    acoes[min.id].map(acao => (
                      <div key={acao.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800 group/acao">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{acao.nome}</p>
                            {acao.descricao && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{acao.descricao}</p>}
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteAcao(acao.id)}
                          className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover/acao:opacity-100 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ministerio Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-2xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">
                {editingMinisterio ? 'Editar Ministério' : 'Novo Ministério'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Preencha os dados oficiais do ministério.</p>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome do Ministério</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 focus:border-primary transition-all outline-none font-medium"
                  placeholder="Ex: Ministério da Saúde"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Endereço</label>
                <textarea 
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 focus:border-primary transition-all outline-none font-medium min-h-[100px]"
                  placeholder="Esplanada dos Ministérios, Bloco..."
                  value={formData.endereco}
                  onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 transition-all uppercase text-xs tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 uppercase text-xs tracking-widest"
                >
                  {editingMinisterio ? 'Salvar Alterações' : 'Criar Ministério'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Acao Modal */}
      {showAcaoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">
                Nova Ação
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Vincule uma nova ação a este ministério.</p>
            </div>
            <form onSubmit={handleAcaoSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome da Ação</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 focus:border-primary transition-all outline-none font-medium"
                  placeholder="Ex: Aquisição de Ambulâncias"
                  value={acaoFormData.nome}
                  onChange={e => setAcaoFormData({ ...acaoFormData, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Descrição (opcional)</label>
                <textarea 
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 focus:border-primary transition-all outline-none font-medium"
                  placeholder="Detalhes sobre a ação..."
                  value={acaoFormData.descricao}
                  onChange={e => setAcaoFormData({ ...acaoFormData, descricao: e.target.value })}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAcaoModal(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 transition-all uppercase text-xs tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 uppercase text-xs tracking-widest"
                >
                  Criar Ação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
