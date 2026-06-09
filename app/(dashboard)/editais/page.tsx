'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Plus, Search, FileSignature, Calendar, Download, Trash2, Edit2, AlertCircle, Save, X, ClipboardList } from 'lucide-react';
import { useDeputado } from '@/context/DeputadoContext';

interface Edital {
  id: string;
  titulo: string;
  data_inicio: string;
  data_fim: string;
  arquivo_pdf_base64: string | null;
  id_deputado: string;
}

export default function EditaisPage() {
  const { selectedDeputado } = useDeputado();
  const [editais, setEditais] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingEdital, setEditingEdital] = useState<Edital | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: '',
    data_inicio: '',
    data_fim: '',
    arquivo_pdf_base64: ''
  });

  useEffect(() => {
    if (selectedDeputado) {
      fetchEditais();
    }
  }, [selectedDeputado]);

  useEffect(() => {
    if (view === 'editor' && editingEdital) {
      fetchSubmissions(editingEdital.id);
    } else if (view === 'editor' && !editingEdital) {
      setSubmissions([]);
    }
  }, [view, editingEdital]);

  async function fetchEditais() {
    if (!selectedDeputado) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('editais')
        .select('*')
        .eq('id_deputado', selectedDeputado.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setEditais(data);
    } catch (err) {
      console.error('Error fetching editais:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Por favor, envie apenas arquivos PDF.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('O arquivo deve ter no máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData({ ...formData, arquivo_pdf_base64: event.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const fetchSubmissions = async (editalId: string) => {
    setLoadingSubmissions(true);
    try {
      const { data, error } = await supabase
        .from('formularios_emenda')
        .select('*')
        .eq('id_edital', editalId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleDownload = (base64: string, titulo: string) => {
    const a = document.createElement('a');
    a.href = base64;
    a.download = `Edital_${titulo.replace(/\s+/g, '_')}.pdf`;
    a.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeputado) return;

    if (new Date(formData.data_inicio) >= new Date(formData.data_fim)) {
      alert('A Data de Início deve ser menor que a Data Final.');
      return;
    }

    try {
      if (editingEdital) {
        const { error } = await supabase
          .from('editais')
          .update(formData)
          .eq('id', editingEdital.id);
          
        if (error) throw error;
        alert('Edital atualizado com sucesso!');
      } else {
        const payload = {
          ...formData,
          id_deputado: selectedDeputado.id
        };
        const { error } = await supabase.from('editais').insert([payload]);
        if (error) throw error;
        alert('Edital cadastrado com sucesso!');
      }
      
      setView('list');
      setEditingEdital(null);
      setFormData({ titulo: '', data_inicio: '', data_fim: '', arquivo_pdf_base64: '' });
      fetchEditais();
    } catch (err: any) {
      console.error('Save error:', err);
      alert(`Erro: ${err.message || 'Falha ao salvar o edital.'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este edital?')) {
      try {
        const { error } = await supabase.from('editais').delete().eq('id', id);
        if (error) throw error;
        fetchEditais();
      } catch (err) {
        console.error('Delete error:', err);
        alert('Erro ao excluir edital.');
      }
    }
  };

  const filteredEditais = editais.filter(e => 
    e.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (view === 'editor') {
    return (
      <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setView('list');
                setEditingEdital(null);
                setSubmissions([]);
              }}
              className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-colors border-2 border-slate-100 dark:border-slate-800"
            >
              <X size={24} />
            </button>
            <div>
              <h2 className="text-3xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">
                {editingEdital ? 'Editar Edital' : 'Novo Edital'}
              </h2>
              <p className="text-slate-500 font-medium">{editingEdital ? 'Atualize as informações e visualize as adesões' : 'Preencha os dados do novo edital'}</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button 
              type="button"
              onClick={() => {
                setView('list');
                setEditingEdital(null);
              }}
              className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors uppercase text-xs tracking-widest"
            >
              Cancelar
            </button>
            <button 
              form="edital-form"
              type="submit"
              className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 uppercase text-xs tracking-widest"
            >
              <Save size={18} />
              Salvar Alterações
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="text-xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight mb-8">Informações Básicas</h3>
              
              <form id="edital-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Título do Edital</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-4 focus:border-primary transition-all outline-none font-medium text-lg"
                    placeholder="Ex: Edital Cultura 2024"
                    value={formData.titulo}
                    onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Data Início</label>
                    <input 
                      type="date" 
                      required
                      className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-4 focus:border-primary transition-all outline-none font-medium text-slate-700 dark:text-slate-200"
                      value={formData.data_inicio}
                      onChange={e => setFormData({ ...formData, data_inicio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Data Fim</label>
                    <input 
                      type="date" 
                      required
                      className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-4 focus:border-primary transition-all outline-none font-medium text-slate-700 dark:text-slate-200"
                      value={formData.data_fim}
                      onChange={e => setFormData({ ...formData, data_fim: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Arquivo do Edital (PDF)</label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 flex items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-8 rounded-2xl cursor-pointer transition-colors border-2 border-dashed border-slate-300 dark:border-slate-700 font-bold group">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <Download size={24} className="text-primary" />
                        </div>
                        <span className="text-sm">{formData.arquivo_pdf_base64 ? 'Documento Carregado' : 'Carregar PDF do Edital'}</span>
                        <span className="text-[10px] font-normal text-slate-400">PDF até 5MB</span>
                      </div>
                      <input 
                        type="file" 
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                    {formData.arquivo_pdf_base64 && (
                      <div className="flex flex-col gap-2">
                        <button 
                          type="button" 
                          onClick={() => handleDownload(formData.arquivo_pdf_base64, formData.titulo)}
                          className="p-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-primary rounded-xl transition-colors shadow-sm"
                          title="Visualizar"
                        >
                          <FileSignature size={20} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setFormData({ ...formData, arquivo_pdf_base64: '' })}
                          className="p-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-500 rounded-xl transition-colors shadow-sm"
                          title="Remover"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-6 rounded-3xl flex gap-4 text-amber-800 dark:text-amber-500">
               <AlertCircle size={24} className="shrink-0" />
               <div>
                  <p className="font-bold text-sm uppercase tracking-widest">Informação Importante</p>
                  <p className="text-xs font-medium mt-1">Todas as adesões vinculadas a este edital serão visualizadas ao lado. Certifique-se de validar as informações de cada projeto cadastrado pelas entidades.</p>
               </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col h-full min-h-[600px]">
            <div className="p-8 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">Adesões ao Edital</h3>
                  <p className="text-slate-500 text-sm font-medium mt-1">Lista de propostas enviadas por entidades</p>
                </div>
                <div className="bg-primary text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-md shadow-primary/20">
                  {submissions.length} Total
                </div>
              </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto">
              {!editingEdital ? (
                 <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
                       <ClipboardList size={32} />
                    </div>
                    <p className="text-slate-500 font-bold">Salve o edital primeiro</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-[240px]">Após cadastrar o edital, você poderá visualizar as adesões que forem chegando por aqui.</p>
                 </div>
              ) : loadingSubmissions ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-slate-800/50 rounded-2xl">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                  <p className="text-sm font-bold uppercase tracking-widest">Carregando adesões...</p>
                </div>
              ) : submissions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
                     <Search size={32} />
                  </div>
                  <p className="text-slate-500 font-bold">Nenhuma adesão encontrada</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[240px]">Ainda não há projetos cadastrados para este edital em específico.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.map(sub => (
                    <div key={sub.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group border-l-4 border-l-primary">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-1 rounded">CNPJ: {sub.cnpj}</span>
                        <span className="text-[10px] font-bold text-slate-400">{new Date(sub.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <h4 className="font-black text-slate-900 dark:text-white uppercase text-sm mb-1 leading-tight">{sub.nome_entidade}</h4>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                           <p className="text-xs text-slate-500 font-bold shrink-0">Projeto:</p>
                           <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{sub.nome_projeto}</p>
                        </div>
                        <div className="pt-3 border-t border-slate-50 dark:border-slate-700 flex justify-between items-center">
                           <Link 
                             href={`/formularios/${sub.id}`}
                             className="text-[10px] font-black text-primary hover:underline uppercase tracking-tighter flex items-center gap-1"
                           >
                              Ver Detalhes Completo
                              <Plus size={10} />
                           </Link>
                           <span className="text-[10px] font-bold text-slate-400 italic">ID Adesão: #{sub.id.split('-')[0]}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {!selectedDeputado && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-center gap-4 text-amber-800">
          <AlertCircle size={24} className="shrink-0" />
          <div>
            <p className="font-bold">Atenção</p>
            <p className="text-sm">Selecione um deputado na barra superior para gerenciar os editais vinculados.</p>
          </div>
        </div>
      )}

      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${!selectedDeputado ? 'opacity-50 pointer-events-none' : ''}`}>
        <div>
          <h2 className="text-3xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">
            Editais
          </h2>
          <p className="text-slate-500 font-medium mt-1">Gerencie os editais e seus prazos</p>
        </div>
        
        <button 
          onClick={() => {
            setEditingEdital(null);
            setFormData({ titulo: '', data_inicio: '', data_fim: '', arquivo_pdf_base64: '' });
            setView('editor');
          }}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 active:scale-95 uppercase text-xs tracking-widest"
          disabled={!selectedDeputado}
        >
          <Plus size={18} />
          Novo Edital
        </button>
      </div>

      <div className={`flex items-center bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-sm border border-slate-200 dark:border-slate-700 max-w-md ${!selectedDeputado ? 'opacity-50 pointer-events-none' : ''}`}>
        <Search className="text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar edital..." 
          className="bg-transparent border-none focus:ring-0 w-full ml-2 text-slate-700 dark:text-slate-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={!selectedDeputado}
        />
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${!selectedDeputado ? 'opacity-50 pointer-events-none' : ''}`}>
        {loading && selectedDeputado ? (
          <div className="col-span-full py-20 text-center text-slate-500">Carregando editais...</div>
        ) : !selectedDeputado ? (
          <div className="col-span-full py-20 text-center text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            Selecione um deputado para visualizar os editais.
          </div>
        ) : filteredEditais.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            Nenhum edital encontrado para este deputado.
          </div>
        ) : (
          filteredEditais.map(edital => (
            <div key={edital.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4 hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                    <FileSignature size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{edital.titulo}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl flex items-center gap-3">
                 <Calendar className="text-slate-400" size={16} />
                 <div>
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Período</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {new Date(edital.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')} até{' '}
                      {new Date(edital.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                 </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingEdital(edital);
                      setFormData({
                        titulo: edital.titulo,
                        data_inicio: edital.data_inicio,
                        data_fim: edital.data_fim,
                        arquivo_pdf_base64: edital.arquivo_pdf_base64 || ''
                      });
                      setView('editor');
                    }}
                    className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(edital.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                {edital.arquivo_pdf_base64 && (
                  <button 
                    onClick={() => handleDownload(edital.arquivo_pdf_base64!, edital.titulo)}
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold shadow-sm"
                  >
                    <Download size={14} />
                    Download
                  </button>
                )}
              </div>

              <div className="pt-4 mt-2 border-t border-slate-50 dark:border-slate-800">
                <button 
                  onClick={() => {
                    setEditingEdital(edital);
                    setFormData({
                      titulo: edital.titulo,
                      data_inicio: edital.data_inicio,
                      data_fim: edital.data_fim,
                      arquivo_pdf_base64: edital.arquivo_pdf_base64 || ''
                    });
                    setView('editor');
                  }}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-500 hover:text-primary transition-colors"
                >
                  Ver Adesões
                  <Plus size={14} className="transform transition-transform" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
