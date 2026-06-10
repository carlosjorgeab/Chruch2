'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useIgreja } from '@/context/IgrejaContext';
import { ClipboardCheck, Save, RefreshCw, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

type Licao = {
  id: string;
  titulo: string;
  data: string | null;
};

type Membro = {
  id: string;
  nome: string;
  cargo: string | null;
};

type PresencaRecord = {
  id_membro: string;
  status_presenca: 'Presente' | 'Falta';
};

export default function PresencasPage() {
  const { selectedIgreja } = useIgreja();
  const [lecoes, setLecoes] = useState<Licao[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [selectedLicaoId, setSelectedLicaoId] = useState('');
  const [presencas, setPresencas] = useState<Record<string, 'Presente' | 'Falta'>>({});
  
  const [loading, setLoading] = useState(true);
  const [loadingPresencas, setLoadingPresencas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (selectedIgreja) {
      loadInitialData();
    } else {
      setLecoes([]);
      setMembros([]);
      setSelectedLicaoId('');
      setLoading(false);
    }
  }, [selectedIgreja]);

  useEffect(() => {
    if (selectedLicaoId) {
      loadPresencas(selectedLicaoId);
    } else {
      setPresencas({});
    }
  }, [selectedLicaoId]);

  async function loadInitialData() {
    if (!selectedIgreja) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // 1. Fetch lessons
      const { data: lecoesData, error: errLec } = await supabase
        .from('lecoes')
        .select('id, titulo, data')
        .eq('id_igreja', selectedIgreja.id)
        .order('data', { ascending: false });

      if (errLec) throw errLec;

      // 2. Fetch members
      const { data: membrosData, error: errMem } = await supabase
        .from('membros')
        .select('id, nome, cargo')
        .eq('id_igreja', selectedIgreja.id)
        .eq('status', 'Ativo')
        .order('nome', { ascending: true });

      if (errMem) throw errMem;

      setLecoes(lecoesData || []);
      setMembros(membrosData || []);

      if (lecoesData && lecoesData.length > 0) {
        setSelectedLicaoId(lecoesData[0].id);
      } else {
        setSelectedLicaoId('');
      }
    } catch (e: any) {
      setError('Erro ao carregar dados iniciais: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function loadPresencas(licaoId: string) {
    try {
      setLoadingPresencas(true);
      setError('');
      
      const { data, error: err } = await supabase
        .from('presencas')
        .select('id_membro, status_presenca')
        .eq('id_lecao', licaoId);

      if (err) throw err;

      const initialPresencas: Record<string, 'Presente' | 'Falta'> = {};
      
      // Default all members to Falta initially, then overlay database records
      membros.forEach(m => {
        initialPresencas[m.id] = 'Falta';
      });

      if (data) {
        data.forEach((p: any) => {
          initialPresencas[p.id_membro] = p.status_presenca;
        });
      }

      setPresencas(initialPresencas);
    } catch (e: any) {
      setError('Erro ao carregar presenças salvas: ' + (e.message || e));
    } finally {
      setLoadingPresencas(false);
    }
  }

  const handleTogglePresenca = (membroId: string) => {
    setPresencas(prev => ({
      ...prev,
      [membroId]: prev[membroId] === 'Presente' ? 'Falta' : 'Presente'
    }));
  };

  const handleAllPresent = () => {
    const updated: Record<string, 'Presente' | 'Falta'> = {};
    membros.forEach(m => {
      updated[m.id] = 'Presente';
    });
    setPresencas(updated);
  };

  const handleClearAll = () => {
    const updated: Record<string, 'Presente' | 'Falta'> = {};
    membros.forEach(m => {
      updated[m.id] = 'Falta';
    });
    setPresencas(updated);
  };

  const handleSave = async () => {
    if (!selectedLicaoId || !selectedIgreja) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // 1. Delete existing presencas for this lesson to write clean slate
      const { error: delError } = await supabase
        .from('presencas')
        .delete()
        .eq('id_lecao', selectedLicaoId);

      if (delError) throw delError;

      // 2. Filter only "Presente" records to avoid inserting redundant "Falta" rows
      const inserts = Object.entries(presencas)
        .filter(([_, status]) => status === 'Presente')
        .map(([membroId, status]) => ({
          id_igreja: selectedIgreja.id,
          id_lecao: selectedLicaoId,
          id_membro: membroId,
          status_presenca: status
        }));

      if (inserts.length > 0) {
        const { error: insError } = await supabase
          .from('presencas')
          .insert(inserts);

        if (insError) throw insError;
      }

      setSuccess('Presenças registradas com sucesso para a aula selecionada!');
    } catch (e: any) {
      setError('Erro ao salvar chamada técnica: ' + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-1">Membros & Ensino</p>
        <h2 className="text-3xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">Presenças / Assistência</h2>
        <p className="text-slate-500 text-sm">Registre e acompanhe a presença dos membros nas lições bíblicas</p>
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

      {loading ? (
        <div className="p-20 text-center font-bold uppercase tracking-widest text-xs text-slate-400 flex flex-col items-center justify-center gap-4">
          <RefreshCw className="animate-spin text-amber-600" size={32} />
          <span>Carregando chamada e calendário...</span>
        </div>
      ) : lecoes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 rounded-3xl text-center space-y-4 shadow-sm">
          <AlertCircle size={40} className="text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nenhuma Aula Criada</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
            Antes de fazer a chamada, você precisa publicar uma aula ou lição no menu <strong className="font-bold">Lições</strong>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar - Seletor de Lição */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 h-fit space-y-6 shadow-sm">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Selecione a lição</h3>
              <select
                value={selectedLicaoId}
                onChange={(e) => setSelectedLicaoId(e.target.value)}
                disabled={loadingPresencas || saving}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold text-sm"
              >
                {lecoes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.data ? `${new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR')} - ` : ''}{l.titulo}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-850 space-y-3">
              <button
                onClick={handleAllPresent}
                disabled={loadingPresencas || saving}
                className="w-full text-xs font-black uppercase tracking-wider py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-300 rounded-xl transition-all"
              >
                Marcar Todos Importantes / Presentes
              </button>
              <button
                onClick={handleClearAll}
                disabled={loadingPresencas || saving}
                className="w-full text-xs font-black uppercase tracking-wider py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-300 rounded-xl transition-all"
              >
                Limpar Presenças / Faltas
              </button>
            </div>

            <button
              onClick={handleSave}
              disabled={loadingPresencas || saving || membros.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 hover:opacity-90 active:scale-98 disabled:opacity-50 font-black rounded-xl uppercase text-xs tracking-widest transition-all"
            >
              {saving ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <Save size={16} />
              )}
              {saving ? 'Registrando...' : 'Confirmar Chamada'}
            </button>
          </div>

          {/* Lista de Membros para chamada */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                Membros Ativos ({membros.length})
              </span>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-full border border-amber-100 dark:border-amber-900/10">
                Presents: {Object.values(presencas).filter(status => status === 'Presente').length}
              </span>
            </div>

            {loadingPresencas ? (
              <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                Sincronizando livro de presenças...
              </div>
            ) : membros.length === 0 ? (
              <div className="p-12 text-center text-slate-400 italic">
                Nenhum membro ativo cadastrado nesta igreja.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {membros.map((m) => {
                  const isPresent = presencas[m.id] === 'Presente';
                  return (
                    <div
                      key={m.id}
                      onClick={() => !saving && handleTogglePresenca(m.id)}
                      className={`flex justify-between items-center p-5 cursor-pointer hover:bg-slate-50/40 dark:hover:bg-slate-950/10 transition-colors ${
                        isPresent ? 'bg-amber-50/10 dark:bg-amber-950/5' : ''
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 select-none text-sm uppercase">
                          {m.nome}
                        </div>
                        {m.cargo && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.cargo}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`text-[9px] uppercase font-black tracking-widest select-none px-2 py-0.5 rounded ${
                          isPresent 
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-450' 
                            : 'bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400'
                        }`}>
                          {isPresent ? 'Presente' : 'Falta'}
                        </span>
                        
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                          isPresent
                            ? 'border-amber-600 bg-amber-600 text-white shadow-sm shadow-amber-600/10'
                            : 'border-slate-300 dark:border-slate-700 hover:border-amber-500'
                        }`}>
                          {isPresent && <CheckCircle size={14} className="fill-current text-white/10" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
