'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Plus, Edit2, Trash2, Save, X, Shield } from 'lucide-react';

type Perfil = {
  id: string;
  nome: string;
  permissoes: string[];
};

const MENU_OPTIONS = [
  { id: '/ministerios', label: 'Cadastro de Ministérios' },
  { id: '/partidos', label: 'Cadastro de Partidos' },
  { id: '/deputados', label: 'Cadastro de Deputados' },
  { id: '/areas-tematicas', label: 'Cadastro de Áreas Temáticas' },
  { id: '/emendas', label: 'Emendas' },
  { id: '/editais', label: 'Cadastro de Editais' },
  { id: '/projetos', label: 'Projetos' },
  { id: '/relatorios', label: 'Relatórios' },
  { id: '/perfis', label: 'Cadastro de Perfis' },
  { id: '/usuarios', label: 'Cadastro de Usuários' },
  { id: '/configuracoes', label: 'Configurações' },
];

export default function PerfisPage() {
  const { user } = useAuth();
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPerfil, setCurrentPerfil] = useState<Partial<Perfil>>({ nome: '', permissoes: [] });
  const [error, setError] = useState('');

  async function fetchPerfis() {
    setLoading(true);
    const { data, error } = await supabase.from('perfis').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setPerfis(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line
    fetchPerfis();
  }, []);

  const handleSave = async () => {
    if (!currentPerfil.nome) {
      setError('O nome do perfil é obrigatório.');
      return;
    }

    setError('');
    const perfilData = {
      nome: currentPerfil.nome,
      permissoes: currentPerfil.permissoes || []
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

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este perfil?')) {
      const { error } = await supabase.from('perfis').delete().eq('id', id);
      if (error) alert('Erro ao excluir perfil. Verifique se existem usuários vinculados.');
      else fetchPerfis();
    }
  };

  const togglePermission = (menuId: string) => {
    const currentPerms = currentPerfil.permissoes || [];
    if (currentPerms.includes(menuId)) {
      setCurrentPerfil({ ...currentPerfil, permissoes: currentPerms.filter(p => p !== menuId) });
    } else {
      setCurrentPerfil({ ...currentPerfil, permissoes: [...currentPerms, menuId] });
    }
  };

  if (!user?.is_admin && !user?.perfil?.permissoes.includes('/perfis')) {
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
            onClick={() => { setCurrentPerfil({ nome: '', permissoes: [] }); setIsEditing(true); }}
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
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Permissões de Acesso</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 opacity-70">
                  <input type="checkbox" checked disabled className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Visão Geral (Sempre liberado)</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 opacity-70">
                  <input type="checkbox" checked disabled className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Visão Mapa (Sempre liberado)</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 opacity-70">
                  <input type="checkbox" checked disabled className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Adesão Edital (Sempre liberado)</span>
                </div>
                {MENU_OPTIONS.map(menu => (
                  <label key={menu.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={(currentPerfil.permissoes || []).includes(menu.id)}
                      onChange={() => togglePermission(menu.id)}
                      className="w-4 h-4 text-primary rounded focus:ring-primary" 
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{menu.label}</span>
                  </label>
                ))}
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
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-md font-medium">Visão Mapa</span>
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-md font-medium">Adesão Edital</span>
                        {perfil.permissoes.map(p => {
                          const menu = MENU_OPTIONS.find(m => m.id === p);
                          return menu ? (
                            <span key={p} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md font-medium">
                              {menu.label}
                            </span>
                          ) : null;
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
