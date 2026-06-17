'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useIgreja } from '@/context/IgrejaContext';
import { useConfirm } from '@/context/ConfirmContext';
import { Plus, Edit2, Trash2, Save, X, Search, Users, Calendar, MapPin, RefreshCw } from 'lucide-react';

type Comunidade = {
  id: string;
  id_igreja: string;
  nome: string;
  descricao: string | null;
  dia_reuniao: string | null;
  horario: string | null;
  local: string | null;
  id_lider: string | null;
  lider?: { nome: string };
};

type Membro = {
  id: string;
  nome: string;
};

export default function ComunidadesPage() {
  const { selectedIgreja } = useIgreja();
  const { confirmDelete } = useConfirm();
  const [comunidades, setComunidades] = useState<Comunidade[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState('');

  const [currentComunidade, setCurrentComunidade] = useState<Partial<Comunidade>>({
    nome: '',
    descricao: '',
    dia_reuniao: 'Quarta-feira',
    horario: '19:30',
    local: '',
    id_lider: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (selectedIgreja) {
      fetchComunidades();
      fetchMembros();
    } else {
      setComunidades([]);
      setMembros([]);
      setLoading(false);
    }
  }, [selectedIgreja]);

  async function fetchComunidades() {
    if (!selectedIgreja) return;
    try {
      setLoading(true);
      setError('');
      const { data, error: err } = await supabase
        .from('comunidades')
        .select('*, lider:membros(nome)')
        .eq('id_igreja', selectedIgreja.id)
        .order('nome', { ascending: true });

      if (err) throw err;
      if (data) {
        setComunidades(data as any);
      }
    } catch (e: any) {
      setError('Erro ao carregar comunidades: ' + (e.message || e));
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
      console.error('Erro ao buscar membros para líderes:', e);
    }
  }

  const handleEdit = (comunidade: Comunidade) => {
    setCurrentComunidade(comunidade);
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleNew = () => {
    if (!selectedIgreja) {
      setError('Selecione uma igreja.');
      return;
    }
    setCurrentComunidade({
      id_igreja: selectedIgreja.id,
      nome: '',
      descricao: '',
      dia_reuniao: 'Quarta-feira',
      horario: '19:30',
      local: '',
      id_lider: '',
    });
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = (id: string, nome: string) => {
    confirmDelete({
      message: `Deseja realmente excluir a comunidade/célula "${nome}"? Esta ação não poderá ser desfeita.`,
      onConfirm: async () => {
        try {
          const { error: err } = await supabase.from('comunidades').delete().eq('id', id);
          if (err) throw err;
          setSuccess('Comunidade excluída com sucesso!');
          fetchComunidades();
        } catch (e: any) {
          setError('Erro ao excluir comunidade: ' + (e.message || e));
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedIgreja) {
      setError('Selecione uma congregação.');
      return;
    }

    if (!currentComunidade.nome) {
      setError('O nome da comunidade é obrigatório.');
      return;
    }

    const payload = {
      id_igreja: selectedIgreja.id,
      nome: currentComunidade.nome,
      descricao: currentComunidade.descricao || null,
      dia_reuniao: currentComunidade.dia_reuniao || null,
      horario: currentComunidade.horario || null,
      local: currentComunidade.local || null,
      id_lider: currentComunidade.id_lider || null,
    };

    try {
      if (currentComunidade.id) {
        const { error: err } = await supabase
          .from('comunidades')
          .update(payload)
          .eq('id', currentComunidade.id);
        if (err) throw err;
        setSuccess('Comunidade atualizada com sucesso!');
      } else {
        const { error: err } = await supabase.from('comunidades').insert(payload);
        if (err) throw err;
        setSuccess('Comunidade cadastrada com sucesso!');
      }
      setIsEditing(false);
      fetchComunidades();
    } catch (e: any) {
      setError('Erro ao salvar comunidade: ' + (e.message || e));
    }
  };

  const filteredComunidades = comunidades.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.descricao && c.descricao.toLowerCase().includes(search.toLowerCase())) ||
    (c.lider && c.lider.nome.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-1">Células e Pequenos Grupos</p>
          <h2 className="text-3xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">Comunidades</h2>
          <p className="text-slate-500 text-sm">
            Grupos de crescimento e comunhão da congregação {selectedIgreja?.nome || ''}
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={handleNew}
            disabled={!selectedIgreja}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-md transition active:scale-95 text-sm uppercase tracking-wider"
          >
            <Plus size={18} />
            Nova Comunidade
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
              {currentComunidade.id ? 'Editar Comunidade' : 'Criar Nova Comunidade / Célula'}
            </h3>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Nome da Comunidade *
              </label>
              <input
                type="text"
                required
                value={currentComunidade.nome || ''}
                onChange={(e) => setCurrentComunidade({ ...currentComunidade, nome: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                placeholder="Ex. Comunidade Restauração"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Líder Responsável
              </label>
              <select
                value={currentComunidade.id_lider || ''}
                onChange={(e) => setCurrentComunidade({ ...currentComunidade, id_lider: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
              >
                <option value="">Selecione um líder...</option>
                {membros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Dia de Reunião
              </label>
              <select
                value={currentComunidade.dia_reuniao || 'Quarta-feira'}
                onChange={(e) => setCurrentComunidade({ ...currentComunidade, dia_reuniao: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
              >
                <option value="Segunda-feira">Segunda-feira</option>
                <option value="Terça-feira">Terça-feira</option>
                <option value="Quarta-feira">Quarta-feira</option>
                <option value="Quinta-feira">Quinta-feira</option>
                <option value="Sexta-feira">Sexta-feira</option>
                <option value="Sábado">Sábado</option>
                <option value="Domingo">Domingo</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Horário da Reunião
              </label>
              <input
                type="text"
                value={currentComunidade.horario || '19:30'}
                onChange={(e) => setCurrentComunidade({ ...currentComunidade, horario: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                placeholder="Ex. 19:30 ou 20:00"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Local de Encontro
              </label>
              <input
                type="text"
                value={currentComunidade.local || ''}
                onChange={(e) => setCurrentComunidade({ ...currentComunidade, local: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold"
                placeholder="Residência do Irmão João ou Sala Principal do Templo"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Descrição da Comunidade
              </label>
              <textarea
                value={currentComunidade.descricao || ''}
                onChange={(e) => setCurrentComunidade({ ...currentComunidade, descricao: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-semibold min-h-[100px]"
                placeholder="Escreva sobre o propósito, o público-alvo ou os objetivos deste pequeno grupo..."
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
              Salvar Comunidade
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar comunidade, descrição ou líder..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-amber-500 transition-all"
            />
          </div>

          {loading ? (
            <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-200 p-12 text-center text-slate-450 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin" />
              Carregando comunidades...
            </div>
          ) : filteredComunidades.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm p-12 text-center text-slate-500 font-medium">
              Nenhuma comunidade cadastrada na congregação.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredComunidades.map((c) => (
                <div key={c.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between">
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center">
                        <Users size={22} />
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition rounded-lg"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.nome)}
                          className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-slate-50 dark:hover:bg-slate-800 transition rounded-lg"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{c.nome}</h4>
                      {c.descricao && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{c.descricao}</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-350">
                        <Calendar size={14} className="text-amber-600" />
                        <span>{c.dia_reuniao} às {c.horario}</span>
                      </div>
                      {c.local && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-350">
                          <MapPin size={14} className="text-slate-400" />
                          <span className="truncate">{c.local}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/40 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Líder</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{c.lider?.nome || 'Não definido'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
