'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, User, Edit2, Trash2, Camera, Link as LinkIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Partido {
  id: string;
  sigla: string;
}

interface Deputado {
  id: string;
  nome: string;
  slug: string;
  id_partido: string;
  estado: string;
  foto_url: string;
  ativo: boolean;
  partidos?: Partido;
}

export default function DeputadosPage() {
  const { user } = useAuth();
  const [deputados, setDeputados] = useState<Deputado[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDeputado, setEditingDeputado] = useState<Deputado | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    slug: '',
    id_partido: '',
    estado: 'PR',
    foto_url: '',
    ativo: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: depData, error: depError } = await supabase
        .from('deputado')
        .select('*, partidos(sigla)')
        .order('nome');
      
      if (depError) throw depError;
      setDeputados(depData || []);

      const { data: parData, error: parError } = await supabase
        .from('partidos')
        .select('id, sigla')
        .order('sigla');
      
      if (parError) throw parError;
      setPartidos(parData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }

  const generateSlug = (nome: string) => {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleNomeChange = (nome: string) => {
    setFormData(prev => ({
      ...prev,
      nome,
      slug: prev.slug === generateSlug(prev.nome) || !prev.slug ? generateSlug(nome) : prev.slug
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDeputado) {
        const { error } = await supabase.from('deputado').update(formData).eq('id', editingDeputado.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('deputado').insert([formData]);
        if (error) throw error;
      }
      setShowModal(false);
      setEditingDeputado(null);
      setFormData({ nome: '', slug: '', id_partido: '', estado: 'PR', foto_url: '', ativo: true });
      fetchData();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const deleteDeputado = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este deputado?')) {
      const { error } = await supabase.from('deputado').delete().eq('id', id);
      if (error) alert('Erro: ' + error.message);
      else fetchData();
    }
  };

  const filteredDeputados = deputados.filter(d => 
    d.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user?.is_admin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <AlertCircle size={48} className="mb-4 opacity-20" />
        <p className="font-bold uppercase tracking-widest text-sm">Acesso Restrito</p>
        <p className="text-xs">Apenas administradores podem gerenciar deputados.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">
            Deputados
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Gerencie o cadastro de parlamentares e seus perfis públicos.</p>
        </div>
        <button 
          onClick={() => {
            setEditingDeputado(null);
            setFormData({ nome: '', slug: '', id_partido: '', estado: 'PR', foto_url: '', ativo: true });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 active:scale-95 uppercase text-xs tracking-widest"
        >
          <Plus size={18} />
          Novo Deputado
        </button>
      </div>

      <div className="flex items-center bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-sm border border-slate-200 dark:border-slate-700 max-w-md">
        <Search className="text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar deputado..." 
          className="bg-transparent border-none focus:ring-0 w-full ml-2 text-slate-700 dark:text-slate-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-slate-500 italic">Carregando deputados...</div>
        ) : filteredDeputados.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 uppercase font-black text-xs tracking-widest">
            Nenhum deputado cadastrado.
          </div>
        ) : (
          filteredDeputados.map(dep => (
            <div key={dep.id} className={`bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all group flex flex-col justify-between ${!dep.ativo ? 'opacity-60 grayscale' : ''}`}>
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 relative">
                      {dep.foto_url ? (
                        <img src={dep.foto_url} alt={dep.nome} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <User size={32} />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1">{dep.nome}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                          {dep.partidos?.sigla || 'S/P'}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dep.estado}</span>
                        {!dep.ativo && (
                          <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-black uppercase tracking-widest">Inativo</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingDeputado(dep);
                        setFormData({
                          nome: dep.nome,
                          slug: dep.slug || '',
                          id_partido: dep.id_partido,
                          estado: dep.estado,
                          foto_url: dep.foto_url || '',
                          ativo: dep.ativo
                        });
                        setShowModal(true);
                      }}
                      className="p-2 text-slate-400 hover:text-primary hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => deleteDeputado(dep.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <LinkIcon size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Slug:</span>
                    <span className="text-xs italic truncate">{dep.slug}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                     <Camera size={14} />
                     <span className="text-[10px] font-black uppercase tracking-widest">Foto:</span>
                     <span className="text-xs truncate italic">{dep.foto_url ? 'Configurada' : 'Não definida'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
             <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-2xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">
                  {editingDeputado ? 'Editar Deputado' : 'Novo Deputado'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Cadastre as informações oficiais do parlamentar.</p>
             </div>
             <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome Parlamentar</label>
                        <input 
                            type="text" required
                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 focus:border-primary transition-all outline-none font-bold text-slate-900 dark:text-white"
                            placeholder="Ex: Deputado Silva"
                            value={formData.nome}
                            onChange={e => handleNomeChange(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Slug (URL Amigável)</label>
                        <input 
                            type="text" required
                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 focus:border-primary transition-all outline-none font-medium text-slate-600 dark:text-slate-300"
                            placeholder="deputado-silva"
                            value={formData.slug}
                            onChange={e => setFormData({ ...formData, slug: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Partido</label>
                        <select 
                            required
                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 focus:border-primary transition-all outline-none font-bold text-slate-900 dark:text-white"
                            value={formData.id_partido}
                            onChange={e => setFormData({ ...formData, id_partido: e.target.value })}
                        >
                            <option value="">Selecione...</option>
                            {partidos.map(p => (
                                <option key={p.id} value={p.id}>{p.sigla}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Estado (UF)</label>
                        <input 
                            type="text" required maxLength={2}
                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 focus:border-primary transition-all outline-none font-bold uppercase text-slate-900 dark:text-white"
                            placeholder="PR"
                            value={formData.estado}
                            onChange={e => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Status do Deputado</label>
                        <div className="h-[52px] flex items-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={formData.ativo}
                                    onChange={e => setFormData({ ...formData, ativo: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-green-500"></div>
                                <span className="ml-3 text-sm font-medium text-slate-600 dark:text-slate-400">Ativo no Sistema</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">URL da Foto</label>
                    <input 
                        type="url"
                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 focus:border-primary transition-all outline-none font-medium text-slate-900 dark:text-white"
                        placeholder="https://exemplo.com/foto.jpg"
                        value={formData.foto_url}
                        onChange={e => setFormData({ ...formData, foto_url: e.target.value })}
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
                        {editingDeputado ? 'Salvar Alterações' : 'Criar Deputado'}
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
