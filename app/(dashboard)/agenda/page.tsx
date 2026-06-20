'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useIgreja } from '@/context/IgrejaContext';
import { useConfirm } from '@/context/ConfirmContext';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Search, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  RefreshCw,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type AgendaItem = {
  id: string;
  id_igreja: string;
  titulo: string;
  data_hora: string;
  status: 'Importante' | 'Normal' | 'Alerta';
  created_at?: string;
};

export default function AgendaPage() {
  const { selectedIgreja } = useIgreja();
  const { confirmDelete } = useConfirm();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [titulo, setTitulo] = useState('');
  const [evtDate, setEvtDate] = useState('');
  const [evtTime, setEvtTime] = useState('');
  const [status, setStatus] = useState<'Importante' | 'Normal' | 'Alerta'>('Normal');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedIgreja?.id) {
      fetchAgenda();
    }
  }, [selectedIgreja]);

  const fetchAgenda = async () => {
    if (!selectedIgreja?.id) return;
    try {
      setLoading(true);
      setError('');
      
      const { data, error: fetchErr } = await supabase
        .from('agendas')
        .select('*')
        .eq('id_igreja', selectedIgreja.id)
        .order('data_hora', { ascending: true });

      if (fetchErr) throw fetchErr;
      setItems(data || []);
    } catch (err: any) {
      console.error('Error fetching agenda:', err);
      setError('Erro ao carregar a agenda da igreja: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const initForm = (item?: AgendaItem) => {
    if (item) {
      setEditingId(item.id);
      setTitulo(item.titulo);
      
      const dt = new Date(item.data_hora);
      // Format YYYY-MM-DD
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      setEvtDate(`${year}-${month}-${day}`);
      
      // Format HH:MM
      const hours = String(dt.getHours()).padStart(2, '0');
      const minutes = String(dt.getMinutes()).padStart(2, '0');
      setEvtTime(`${hours}:${minutes}`);
      
      setStatus(item.status);
      setIsEditing(true);
    } else {
      setEditingId(null);
      setTitulo('');
      const today = new Date();
      setEvtDate(today.toISOString().split('T')[0]);
      setEvtTime('19:30');
      setStatus('Normal');
      setIsEditing(true);
    }
    setError('');
    setSuccess('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIgreja?.id) {
      setError('Selecione uma igreja ativa.');
      return;
    }

    if (!titulo.trim()) {
      setError('O nome do evento é obrigatório.');
      return;
    }

    if (!evtDate || !evtTime) {
      setError('A data e a hora do evento são obrigatórias.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      // Create timezone-safe ISO string from Date part and Time part
      const dateTimeString = `${evtDate}T${evtTime}:00`;
      const finalIso = new Date(dateTimeString).toISOString();

      const payload = {
        id_igreja: selectedIgreja.id,
        titulo: titulo.trim(),
        data_hora: finalIso,
        status: status
      };

      if (editingId) {
        // Update
        const { error: patchErr } = await supabase
          .from('agendas')
          .update(payload)
          .eq('id', editingId);

        if (patchErr) throw patchErr;
        setSuccess('Evento atualizado com sucesso!');
      } else {
        // Insert
        const { error: postErr } = await supabase
          .from('agendas')
          .insert([payload]);

        if (postErr) throw postErr;
        setSuccess('Novo evento agendado com sucesso!');
      }

      setIsEditing(false);
      fetchAgenda();
    } catch (err: any) {
      console.error('Error saving agenda item:', err);
      setError('Erro ao salvar item na agenda: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    confirmDelete({
      title: 'Excluir Evento da Agenda',
      message: `Tem certeza que deseja excluir o evento "${name}" permanentemente?`,
      onConfirm: async () => {
        try {
          const { error: delErr } = await supabase
            .from('agendas')
            .delete()
            .eq('id', id);

          if (delErr) throw delErr;
          setSuccess('Evento excluído do cronograma!');
          fetchAgenda();
        } catch (err: any) {
          console.error('Error deleting agenda item:', err);
          setError('Erro ao excluir evento: ' + err.message);
        }
      }
    });
  };

  const filteredItems = items.filter(item => 
    item.titulo.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusStyle = (st: 'Importante' | 'Normal' | 'Alerta') => {
    switch(st) {
      case 'Importante':
        return {
          wrapper: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-900 dark:text-red-300',
          badge: 'bg-red-600 text-white',
          dot: 'bg-red-600',
          border: 'border-red-500/20 dark:border-red-500/10'
        };
      case 'Alerta':
        return {
          wrapper: 'bg-amber-50 dark:bg-amber-950/20 border-amber-250 dark:border-amber-900/30 text-amber-900 dark:text-amber-300',
          badge: 'bg-amber-500 text-slate-900 font-bold',
          dot: 'bg-amber-550',
          border: 'border-amber-500/20 dark:border-amber-500/10'
        };
      case 'Normal':
      default:
        return {
          wrapper: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30 text-blue-900 dark:text-blue-300',
          badge: 'bg-blue-600 text-white',
          dot: 'bg-blue-600',
          border: 'border-blue-500/20 dark:border-blue-500/10'
        };
    }
  };

  const formatEventDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatEventTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <main className="min-h-screen pt-20 pb-16 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 text-slate-800 dark:text-slate-100 font-['Inter']">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header section with ambient design card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/65 dark:border-slate-800/80 shadow-md p-6 sm:p-10 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-amber-500/10 dark:bg-amber-500/5 blur-3xl -z-10 pointer-events-none" />
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#E4A232] text-white rounded-2xl shadow-lg">
                <Calendar size={28} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3.5xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">
                  Agenda da Igreja
                </h1>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-450 dark:text-slate-400 mt-1 uppercase tracking-widest leading-none">
                  Gestão de Cronogramas, Cultos e Eventos
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchAgenda}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl font-bold text-xs tracking-wider uppercase transition flex items-center gap-2 cursor-pointer border border-slate-200/50 dark:border-slate-700/50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
            <button
              onClick={() => initForm()}
              className="px-5 py-3 bg-[#E4A232] hover:bg-[#E4A232]/90 text-white rounded-xl font-black text-xs tracking-wider uppercase shadow-xl shadow-amber-500/20 active:scale-95 duration-200 transition flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              Novo Evento
            </button>
          </div>
        </div>

        {/* Global Error/Success alert feedback */}
        {error && (
          <div className="p-4 bg-red-55/15 border border-red-500/20 text-red-700 dark:text-red-400 rounded-2xl flex items-center gap-3 text-xs font-semibold animate-in fade-in duration-200">
            <AlertTriangle size={18} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-55/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-2xl flex items-center gap-3 text-xs font-semibold animate-in fade-in duration-200">
            <CheckCircle size={18} className="shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {/* Agenda Scheduling & Editing drawer modal dialog */}
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-10 w-full max-w-lg relative animate-in zoom-in-95 duration-250">
              <button
                onClick={() => setIsEditing(false)}
                className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 cursor-pointer transition"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
                <Calendar className="text-amber-500" size={24} />
                <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  {editingId ? 'Editar Evento' : 'Agendar Novo Evento'}
                </h2>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    Nome do Evento
                  </label>
                  <input
                    type="text"
                    required
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Culto de Jovens, Reunião de Líderes"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 dark:focus:border-amber-500 outline-none font-semibold transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      Data
                    </label>
                    <input
                      type="date"
                      required
                      value={evtDate}
                      onChange={(e) => setEvtDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-semibold transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      Hora
                    </label>
                    <input
                      type="time"
                      required
                      value={evtTime}
                      onChange={(e) => setEvtTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-semibold transition py-3"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    Status / Prioridade
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 outline-none font-semibold transition cursor-pointer"
                  >
                    <option value="Normal">Normal (Azul)</option>
                    <option value="Importante">Importante (Vermelho)</option>
                    <option value="Alerta">Alerta (Amarelo)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
                    Cada status possui cores informativas distintas na Agenda e Painéis de Controle.
                  </p>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 rounded-xl bg-[#E4A232] hover:bg-[#E4A232]/90 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/10 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Save size={14} />
                    {submitting ? 'Salvando...' : 'Salvar Evento'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Search bar and metadata indicators */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/85 p-5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Pesquisar evento pelo nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 outline-none text-xs font-semibold"
            />
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-400 dark:text-slate-500">
            <p>Total: <span className="text-slate-700 dark:text-slate-300 font-black">{filteredItems.length}</span> eventos</p>
          </div>
        </div>

        {/* Agenda Events rendering area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-250/20">
            <RefreshCw className="animate-spin text-amber-500 mb-3" size={32} />
            <p className="text-sm font-semibold text-slate-450">Buscando cronograma e eventos da igreja...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-150 dark:border-slate-800 shadow-sm min-h-[300px]">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-[#E4A232] flex items-center justify-center mb-4">
              <Calendar size={32} />
            </div>
            <h3 className="text-base font-black uppercase text-slate-800 dark:text-white tracking-tight">Nenhum evento registrado</h3>
            <p className="text-xs text-slate-450 max-w-sm mt-1.5 font-medium leading-relaxed">
              Não há eventos ou programações cadastradas {search ? 'com esse nome' : 'para a igreja selecionada'}. Toque em "Novo Evento" para começar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, index) => {
                const styles = getStatusStyle(item.status);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.04 }}
                    className={`bg-white dark:bg-slate-900 border ${styles.border} rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between items-start gap-4 h-full relative`}
                  >
                    {/* Event Status Warning indicators */}
                    {item.status === 'Alerta' && (
                      <div className="absolute top-6 right-6">
                        <span className="flex h-3.5 w-3.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
                        </span>
                      </div>
                    )}

                    <div className="space-y-4 w-full">
                      {/* Priority Tag line */}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${styles.wrapper}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                        Status: {item.status === 'Normal' ? 'Normal (Azul)' : item.status === 'Importante' ? 'Importante (Vermelho)' : 'Alerta (Amarelo)'}
                      </span>

                      {/* Event Title */}
                      <h3 className="text-sm font-black uppercase tracking-tight text-slate-850 dark:text-white leading-snug line-clamp-2">
                        {item.titulo}
                      </h3>

                      {/* Date and Time block */}
                      <div className="space-y-2 border-t border-slate-100 dark:border-slate-850 pt-4 w-full">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-xs">
                          <Calendar size={14} className="text-amber-500 shrink-0" />
                          <span className="line-clamp-1">{formatEventDate(item.data_hora)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-xs">
                          <Clock size={14} className="text-amber-500 shrink-0" />
                          <span>{formatEventTime(item.data_hora)} Horas</span>
                        </div>
                      </div>
                    </div>

                    {/* Controller actions */}
                    <div className="flex gap-2 w-full pt-4 border-t border-slate-100 dark:border-slate-850/80 mt-auto justify-end">
                      <button
                        onClick={() => initForm(item)}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 rounded-xl transition duration-200 hover:scale-[1.04] cursor-pointer"
                        title="Modificar Evento"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.titulo)}
                        className="p-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl transition duration-200 hover:scale-[1.04] cursor-pointer"
                        title="Excluir Evento"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

      </div>
    </main>
  );
}
