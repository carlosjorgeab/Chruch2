'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Flag, Edit2, Trash2, Palette, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Partido {
  id: string;
  sigla: string;
  nome: string;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  cor_terciaria: string | null;
}

export default function PartidosPage() {
  const { user } = useAuth();
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPartido, setEditingPartido] = useState<Partido | null>(null);
  
  const [formData, setFormData] = useState({
    sigla: '',
    nome: '',
    cor_primaria: '#cc0000',
    cor_secundaria: '#000000',
    cor_terciaria: '#ffffff'
  });

  useEffect(() => {
    fetchPartidos();
  }, []);

  async function fetchPartidos() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('partidos')
        .select('*')
        .order('sigla');
      
      if (error) throw error;
      setPartidos(data || []);
    } catch (err) {
      console.error('Error fetching partidos:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPartido) {
        const { error } = await supabase.from('partidos').update(formData).eq('id', editingPartido.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('partidos').insert([formData]);
        if (error) throw error;
      }
      setShowModal(false);
      setEditingPartido(null);
      setFormData({ sigla: '', nome: '', cor_primaria: '#cc0000', cor_secundaria: '#000000', cor_terciaria: '#ffffff' });
      fetchPartidos();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const deletePartido = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este partido?')) {
      const { error } = await supabase.from('partidos').delete().eq('id', id);
      if (error) {
        alert('Erro ao excluir: ' + error.message);
      } else {
        fetchPartidos();
      }
    }
  };

  const filteredPartidos = partidos.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sigla.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user?.is_admin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <AlertCircle size={48} className="mb-4 opacity-20" />
        <p className="font-bold uppercase tracking-widest text-sm">Acesso Restrito</p>
        <p className="text-xs">Apenas administradores podem gerenciar partidos.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">
            Partidos Políticos
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Gerencie o cadastro de partidos e suas cores de identidade visual.</p>
        </div>
        <button 
          onClick={() => {
            setEditingPartido(null);
            setFormData({ sigla: '', nome: '', cor_primaria: '#cc0000', cor_secundaria: '#000000', cor_terciaria: '#ffffff' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 active:scale-95 uppercase text-xs tracking-widest"
        >
          <Plus size={18} />
          Novo Partido
        </button>
      </div>

      <div className="flex items-center bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-sm border border-slate-200 dark:border-slate-700 max-w-md">
        <Search className="text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar partido..." 
          className="bg-transparent border-none focus:ring-0 w-full ml-2 text-slate-700 dark:text-slate-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-slate-500 italic">Carregando partidos...</div>
        ) : filteredPartidos.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 uppercase font-black text-xs tracking-widest">
            Nenhum partido cadastrado.
          </div>
        ) : (
          filteredPartidos.map(partido => (
            <div key={partido.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-inner" style={{ backgroundColor: partido.cor_primaria || '#ccc' }}>
                      {partido.sigla[0]}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">{partido.sigla}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1">{partido.nome}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingPartido(partido);
                        setFormData({
                          sigla: partido.sigla,
                          nome: partido.nome,
                          cor_primaria: partido.cor_primaria || '#cc0000',
                          cor_secundaria: partido.cor_secundaria || '#000000',
                          cor_terciaria: partido.cor_terciaria || '#ffffff'
                        });
                        setShowModal(true);
                      }}
                      className="p-2 text-slate-400 hover:text-primary hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => deletePartido(partido.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: partido.cor_primaria || 'transparent' }} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primária: {partido.cor_primaria}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: partido.cor_secundaria || 'transparent' }} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secundária: {partido.cor_secundaria}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: partido.cor_terciaria || 'transparent' }} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Terciária: {partido.cor_terciaria}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-2xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">
                  {editingPartido ? 'Editar Partido' : 'Novo Partido'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Defina a identidade do partido político.</p>
             </div>
             <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Sigla</label>
                        <input 
                            type="text" required
                            maxLength={20}
                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 focus:border-primary transition-all outline-none font-bold uppercase text-slate-900 dark:text-white"
                            placeholder="Ex: PT"
                            value={formData.sigla}
                            onChange={e => setFormData({ ...formData, sigla: e.target.value.toUpperCase() })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cores da Identidade</label>
                        <div className="flex gap-3">
                            <input 
                                type="color"
                                className="w-12 h-12 bg-transparent border-none rounded-lg cursor-pointer"
                                value={formData.cor_primaria}
                                onChange={e => setFormData({ ...formData, cor_primaria: e.target.value })}
                            />
                            <input 
                                type="color"
                                className="w-12 h-12 bg-transparent border-none rounded-lg cursor-pointer"
                                value={formData.cor_secundaria}
                                onChange={e => setFormData({ ...formData, cor_secundaria: e.target.value })}
                            />
                             <input 
                                type="color"
                                className="w-12 h-12 bg-transparent border-none rounded-lg cursor-pointer"
                                value={formData.cor_terciaria}
                                onChange={e => setFormData({ ...formData, cor_terciaria: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome Completo (Mínimo 20 caracteres sugeridos)</label>
                    <input 
                        type="text" required
                        maxLength={100}
                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 focus:border-primary transition-all outline-none font-medium text-slate-900 dark:text-white"
                        placeholder="Partido dos Trabalhadores"
                        value={formData.nome}
                        onChange={e => setFormData({ ...formData, nome: e.target.value })}
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
                        {editingPartido ? 'Salvar Alterações' : 'Criar Partido'}
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
