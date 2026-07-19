'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useIgreja } from '@/context/IgrejaContext';
import { useConfirm } from '@/context/ConfirmContext';
import { Plus, Edit2, Trash2, Save, X, Shield } from 'lucide-react';

type Perfil = {
  id: string;
  nome: string;
  permissoes: string[];
  id_igreja: string | null;
};

const MODULES_LIST = [
  { id: 'membros', label: 'Gestão de Membros' },
  { id: 'comunidades', label: 'Gestão de Comunidades' },
  { id: 'agenda', label: 'Agenda da Igreja' },
  { id: 'eventos', label: 'Gestão de Eventos' },
  { id: 'mural', label: 'Mural de Avisos' },
  { id: 'licoes', label: 'Gestão de Lições' },
  { id: 'presencas', label: 'Controle de Presenças / Assistências' },
  { id: 'financeiro', label: 'Gestão Financeira' },
  { id: 'fornecedores', label: 'Cadastro de Fornecedores' },
  { id: 'kids', label: 'Módulo Kids (Check-in/Turmas/Salas)' },
];

const ACTIONS = [
  { id: 'leitura', label: 'Leitura' },
  { id: 'novo', label: 'Novo' },
  { id: 'editar', label: 'Editar' },
  { id: 'excluir', label: 'Excluir' },
];

export default function PerfisPage() {
  const { user, hasPermission } = useAuth();
  const { selectedIgreja } = useIgreja();
  const { confirmDelete } = useConfirm();
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPerfil, setCurrentPerfil] = useState<Partial<Perfil>>({ nome: '', permissoes: [], id_igreja: null });
  const [error, setError] = useState('');

  async function fetchPerfis() {
    if (!selectedIgreja?.id) {
      setPerfis([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id_igreja', selectedIgreja.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setPerfis(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPerfis();
  }, [selectedIgreja?.id]);

  const handleSave = async () => {
    if (!currentPerfil.nome) {
      setError('O nome do perfil é obrigatório.');
      return;
    }
    if (!selectedIgreja?.id) {
      setError('Selecione uma igreja ativa no sistema.');
      return;
    }

    setError('');
    const perfilData = {
      nome: currentPerfil.nome,
      permissoes: currentPerfil.permissoes || [],
      id_igreja: selectedIgreja.id
    };

    if (currentPerfil.id) {
      const { error } = await supabase.from('perfis').update(perfilData).eq('id', currentPerfil.id);
      if (error) setError('Erro ao atualizar perfil.');
      else {
        setIsEditing(false);
        fetchPerfis();
      }
    } else {
      const { error } = await supabase.from('perfis').insert([perfilData]);
      if (error) setError('Erro ao criar perfil.');
      else {
        setIsEditing(false);
        fetchPerfis();
      }
    }
  };

  const handleDelete = (id: string) => {
    confirmDelete({
      message: 'Tem certeza que deseja excluir este perfil? Esta ação não poderá ser desfeita e exigirá que nenhum usuário esteja vinculado a ele.',
      onConfirm: async () => {
        const { error } = await supabase.from('perfis').delete().eq('id', id);
        if (error) alert('Erro ao excluir perfil. Verifique se existem usuários vinculados.');
        else fetchPerfis();
      }
    });
  };

  const togglePermission = (menuId: string) => {
    const currentPerms = currentPerfil.permissoes || [];
    if (currentPerms.includes(menuId)) {
      setCurrentPerfil({ ...currentPerfil, permissoes: currentPerms.filter(p => p !== menuId) });
    } else {
      setCurrentPerfil({ ...currentPerfil, permissoes: [...currentPerms, menuId] });
    }
  };

  if (!user?.id_master && !user?.is_admin && !hasPermission('/perfis')) {
    return <div className="p-8 text-center text-slate-500">Acesso negado.</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Shield className="text-primary" />
            Cadastro de Perfis
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie os perfis de acesso e suas permissões</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => { setCurrentPerfil({ nome: '', permissoes: [], id_igreja: selectedIgreja?.id || null }); setIsEditing(true); }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-primary/90 transition-colors"
          >
            <Plus size={20} />
            Novo Perfil
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">{currentPerfil.id ? 'Editar Perfil' : 'Novo Perfil'}</h2>
          
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Perfil</label>
              <input 
                type="text" 
                value={currentPerfil.nome} 
                onChange={(e) => setCurrentPerfil({...currentPerfil, nome: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                placeholder="Ex: Assessor"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Permissões de Acesso por Módulo</label>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="p-4">Módulo</th>
                      <th className="p-4 text-center">Leitura</th>
                      <th className="p-4 text-center">Novo</th>
                      <th className="p-4 text-center">Editar</th>
                      <th className="p-4 text-center">Excluir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODULES_LIST.map(mod => (
                      <tr key={mod.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="p-4 font-bold text-sm text-slate-800 dark:text-slate-200">{mod.label}</td>
                        {ACTIONS.map(act => {
                          const permId = `${mod.id}:${act.id}`;
                          const isChecked = (currentPerfil.permissoes || []).includes(permId);
                          return (
                            <td key={act.id} className="p-4 text-center">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePermission(permId)}
                                className="w-4 h-4 text-amber-600 border-slate-300 dark:border-slate-600 rounded focus:ring-amber-500 cursor-pointer"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-primary/90 transition-colors"
              >
                <Save size={20} />
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Carregando...</div>
          ) : perfis.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum perfil cadastrado.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-400 text-sm">Nome do Perfil</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-400 text-sm">Permissões</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-400 text-sm text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {perfis.map(perfil => (
                  <tr key={perfil.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{perfil.nome}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-md font-medium">Visão Geral</span>
                        {perfil.permissoes.map(p => {
                          if (p.includes(':')) {
                            const [mod, act] = p.split(':');
                            const modObj = MODULES_LIST.find(m => m.id === mod);
                            if (modObj) {
                              return (
                                <span key={p} className="px-2 py-1 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 text-xs rounded-md font-bold uppercase">
                                  {modObj.label} ({act})
                                </span>
                              );
                            }
                          }
                          return (
                            <span key={p} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-md font-medium">
                              {p}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setCurrentPerfil(perfil); setIsEditing(true); }}
                          className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(perfil.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
