'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useIgreja } from '@/context/IgrejaContext';
import { Plus, Edit2, Trash2, Save, X, Search, BookOpen, Calendar, HelpCircle, RefreshCw } from 'lucide-react';

type DecodedLicao = {
  id: string;
  id_igreja: string;
  titulo: string;
  descricao: string | null;
  tipo: string | null;
  referencia_biblica: string | null;
  data: string | null;
  id_professor: string | null;
  status: 'Programada' | 'Completada' | 'Cancelada';
  professor?: { nome: string };
};

type Membro = {
  id: string;
  nome: string;
};

export default function LicoesPage() {
  const { selectedIgreja } = useIgreja();
  const [lecoes, setLecoes] = useState<DecodedLicao[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const [currentLicao, setCurrentLicao] = useState<Partial<DecodedLicao>>({
    titulo: '',
    descricao: '',
    tipo: 'Escola Dominical',
    referencia_biblica: '',
    data: '',
    id_professor: '',
    status: 'Programada',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (selectedIgreja) {
      fetchLecoes();
      fetchMembros();
    } else {
      setLecoes([]);
      setMembros([]);
      setLoading(false);
    }
  }, [selectedIgreja]);

  async function fetchLecoes() {
    if (!selectedIgreja) return;
    try {
      setLoading(true);
      setError('');
      // Table name is 'lecoes' based on schema.sql
      const { data, error: err } = await supabase
        .from('lecoes')
        .select('*, professor:membros(nome)')
        .eq('id_igreja', selectedIgreja.id)
        .order('data', { ascending: false });

      if (err) throw err;
      if (data) {
        setLecoes(data as any);
      }
    } catch (e: any) {
      setError('Erro ao buscar lições: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function fetchMembros() {
    if (!selectedIgreja) return;
    try {
      const { data, error: err } = await supabase
        .from('membros')
        .select('id, nome')
        .eq('id_igreja', selectedIgreja.id)
        .order('nome', { ascending: true });

      if (err) throw err;
      if (data) {
        setMembros(data);
      }
    } catch (e: any) {
      console.error('Erro ao carregar membros para lições:', e);
    }
  }

  const handleEdit = (licao: DecodedLicao) => {
    setCurrentLicao({
      ...licao,
      data: licao.data || '',
    });
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleNew = () => {
    if (!selectedIgreja) {
      setError('Selecione uma igreja.');
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    setCurrentLicao({
      id_igreja: selectedIgreja.id,
      titulo: '',
      descricao: '',
      tipo: 'Escola Dominical',
      referencia_biblica: '',
      data: todayStr,
      id_professor: '',
      status: 'Programada',
    });
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id: string, titulo: string) => {
    if (!confirm(`Deseja realmente excluir a lição "${titulo}"?`)) {
      return;
    }
    try {
      const { error: err } = await supabase.from('lecoes').delete().eq('id', id);
      if (err) throw err;
      setSuccess('Lição excluída com sucesso!');
      fetchLecoes();
    } catch (e: any) {
      setError('Erro ao excluir lição: ' + (e.message || e));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedIgreja) {
      setError('Selecione uma congregação válida.');
      return;
    }

    if (!currentLicao.titulo) {
      setError('O título da lição é obrigatório.');
      return;
    }

    const payload = {
      id_igreja: selectedIgreja.id,
      titulo: currentLicao.titulo,
      descricao: currentLicao.descricao || null,
      tipo: currentLicao.tipo || 'Escola Dominical',
      referencia_biblica: currentLicao.referencia_biblica || null,
      data: currentLicao.data || null,
      id_professor: currentLicao.id_professor || null,
      status: currentLicao.status || 'Programada',
    };

    try {
      if (currentLicao.id) {
        const { error: err } = await supabase
          .from('lecoes')
          .update(payload)
          .eq('id', currentLicao.id);
        if (err) throw err;
        setSuccess('Lição atualizada com sucesso!');
      } else {
        const { error: err } = await supabase.from('lecoes').insert(payload);
        if (err) throw err;
        setSuccess('Lição cadastrada com sucesso!');
      }
      setIsEditing(false);
      fetchLecoes();
    } catch (e: any) {
      setError('Erro ao salvar lição: ' + (e.message || e));
    }
  };

  const filteredLecoes = lecoes.filter(l => {
    const matchesSearch = l.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (l.descricao && l.descricao.toLowerCase().includes(search.toLowerCase())) ||
      (l.referencia_biblica && l.referencia_biblica.toLowerCase().includes(search.toLowerCase()));

    if (statusFilter === 'todos') return matchesSearch;
    return matchesSearch && l.status === statusFilter;
  });

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-1">Escola Bíblica & Estudo</p>
          <h2 className="text-3xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">Lições & Cursos</h2>
          <p className="text-slate-500 text-sm">
            Programação de estudos bíblicos e lições bíbicas da congregação {selectedIgreja?.nome || ''}
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={handleNew}
            disabled={!selectedIgreja}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-md transition active:scale-95 text-sm uppercase tracking-wider"
          >
            <Plus size={18} />
            Nova Lição / Estudo
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 font-bold text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 font-bold text-sm">
          {success}
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-700 pb-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {currentLicao.id ? 'Editar Aula / Lição' : 'Adicionar Nova Lição / Estudo'}
            </h3>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Título do Estudo / Lição *
              </label>
              <input
                type="text"
                required
                value={currentLicao.titulo || ''}
                onChange={(e) => setCurrentLicao({ ...currentLicao, titulo: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                placeholder="Ex. A importância da compaixão no ministério"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Referência Bíblica
              </label>
              <input
                type="text"
                value={currentLicao.referencia_biblica || ''}
                onChange={(e) => setCurrentLicao({ ...currentLicao, referencia_biblica: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                placeholder="Ex. Lucas 10:25-37"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Professor / Expositor
              </label>
              <select
                value={currentLicao.id_professor || ''}
                onChange={(e) => setCurrentLicao({ ...currentLicao, id_professor: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
              >
                <option value="">Selecione um professor...</option>
                {membros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Tipo de Estudo
              </label>
              <select
                value={currentLicao.tipo || 'Escola Dominical'}
                onChange={(e) => setCurrentLicao({ ...currentLicao, tipo: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
              >
                <option value="Escola Dominical">Escola Dominical (EBD)</option>
                <option value="Estudo Bíblico">Estudo Bíblico</option>
                <option value="Culto de Doutrina">Culto de Doutrina</option>
                <option value="Seminário">Seminário</option>
                <option value="Discipulado">Discipulado</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Data do Ensino
              </label>
              <input
                type="date"
                required
                value={currentLicao.data || ''}
                onChange={(e) => setCurrentLicao({ ...currentLicao, data: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Status da Lição
              </label>
              <select
                value={currentLicao.status || 'Programada'}
                onChange={(e) => setCurrentLicao({ ...currentLicao, status: e.target.value as any })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
              >
                <option value="Programada">Programada</option>
                <option value="Completada">Completada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Resumo / Esboço
              </label>
              <textarea
                value={currentLicao.descricao || ''}
                onChange={(e) => setCurrentLicao({ ...currentLicao, descricao: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold min-h-[120px]"
                placeholder="Insira os tópicos, versículos de apoio ou introdução do ensino..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all uppercase text-xs tracking-wider"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:opacity-90 uppercase text-xs tracking-widest"
            >
              <Save size={16} />
              Salvar Lição
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por lição, bíblia ou resumo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-amber-500 transition-all"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
              {['todos', 'Programada', 'Completada', 'Cancelada'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition whitespace-nowrap ${
                    statusFilter === status
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300'
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-450 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {status === 'todos' ? 'Todos os Status' : status}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin" />
                Carregando calendário de lições...
              </div>
            ) : filteredLecoes.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                Nenhuma lição ou estudo programado no momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      <th className="px-6 py-4">Estudo / Lição</th>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Expositor / Professor</th>
                      <th className="px-6 py-4">Canal / Categoria</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium text-slate-700 dark:text-slate-300">
                    {filteredLecoes.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
                              <BookOpen size={20} />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {l.titulo}
                                <span className={`text-[8px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded ${
                                  l.status === 'Completada'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-450'
                                    : l.status === 'Cancelada'
                                    ? 'bg-red-100 text-red-755 dark:bg-red-950/40 dark:text-red-400'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                }`}>
                                  {l.status}
                                </span>
                              </div>
                              {l.referencia_biblica && (
                                <div className="text-xs text-amber-600 font-bold">
                                  Leitura: {l.referencia_biblica}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Calendar size={14} className="text-slate-400" />
                            <span>
                              {l.data
                                ? new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR')
                                : '-'
                              }
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                          {l.professor?.nome || 'Expositor Convidado'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-1 rounded-md font-bold">
                            {l.tipo || 'Estudo Bíblico'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(l)}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-50 dark:hover:bg-slate-900 transition rounded-lg"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(l.id, l.titulo)}
                              className="p-2 text-slate-400 hover:text-red-650 hover:bg-slate-50 dark:hover:bg-slate-900 transition rounded-lg"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
