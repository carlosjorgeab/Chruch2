'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useIgreja } from '@/context/IgrejaContext';
import { useConfirm } from '@/context/ConfirmContext';
import { Plus, Edit2, Trash2, Save, Users, Upload, X, RefreshCw } from 'lucide-react';

type Usuario = {
  id: string;
  nome: string;
  email: string;
  id_perfil: string | null;
  id_igreja: string | null;
  is_admin: boolean;
  ativo?: boolean;
  foto_url?: string;
  perfil?: { nome: string };
  igreja?: { nome: string };
};

export default function UsuariosPage() {
  const { user, hasPermission } = useAuth();
  const { selectedIgreja, igrejas } = useIgreja();
  const { confirmDelete } = useConfirm();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [perfis, setPerfis] = useState<{id: string, nome: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<Usuario> & { senha?: string }>({ 
    nome: '',
    email: '', 
    senha: '', 
    id_perfil: '', 
    id_igreja: '',
    is_admin: false,
    ativo: true,
    foto_url: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelection = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    const file = selectedFiles[0]; // ONLY ONE foto de perfil
    
    setIsUploading(true);
    setError('');
    setSuccess('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/financeiro/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro inesperado no servidor de carregamento.');
      }
      
      if (result.success && result.url) {
        setCurrentUser(prev => ({ ...prev, foto_url: result.url }));
        setSuccess(`Sucesso: "${file.name}" foi salvo com segurança e definido como foto de perfil!`);
      } else {
        throw new Error('Formato de resposta inválido do servidor ao carregar.');
      }
    } catch (err: any) {
      console.error('Erro de upload ao Supabase:', err);
      setError(`Erro no upload de "${file.name}": ${err.message || err}`);
    } finally {
      setIsUploading(false);
    }
  };

  async function fetchData() {
    if (!selectedIgreja?.id) {
      setUsuarios([]);
      setPerfis([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    
    // Fetch users for selected church
    const { data: usersData, error: usersError } = await supabase
      .from('usuarios')
      .select('*, perfil:perfis(nome), igreja:igrejas(nome)')
      .eq('id_igreja', selectedIgreja.id)
      .order('created_at', { ascending: false });
      
    if (!usersError && usersData) {
      setUsuarios(usersData as any);
    }

    // Fetch profiles for selected church
    const { data: perfisData } = await supabase
      .from('perfis')
      .select('id, nome')
      .eq('id_igreja', selectedIgreja.id);
    if (perfisData) {
      setPerfis(perfisData);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [selectedIgreja?.id]);

  const handleSave = async () => {
    if (!currentUser.email) {
      setError('O e-mail ou usuário é obrigatório.');
      return;
    }
    if (!currentUser.id && !currentUser.senha) {
      setError('A senha é obrigatória para novos usuários.');
      return;
    }
    if (!currentUser.is_admin && !currentUser.id_perfil) {
      setError('Selecione um perfil para o usuário.');
      return;
    }
    if (!currentUser.is_admin && !selectedIgreja?.id) {
      setError('Selecione uma igreja ativa no sistema.');
      return;
    }

    setError('');
    const userData: any = {
      nome: currentUser.nome || '',
      email: currentUser.email,
      id_perfil: currentUser.is_admin ? null : currentUser.id_perfil,
      id_igreja: selectedIgreja?.id || null,
      is_admin: currentUser.is_admin || false,
      ativo: currentUser.ativo !== false,
      foto_url: currentUser.foto_url || ''
    };

    if (currentUser.senha) {
      userData.senha = currentUser.senha;
    }

    if (currentUser.id) {
      let { error: err } = await supabase.from('usuarios').update(userData).eq('id', currentUser.id);
      
      if (err && err.message?.includes('column "ativo" of relation "usuarios" does not exist')) {
        const fallbackData = { ...userData };
        delete fallbackData.ativo;
        const fallbackRes = await supabase.from('usuarios').update(fallbackData).eq('id', currentUser.id);
        err = fallbackRes.error;
        if (!err) {
          alert("Alerta: O usuário foi atualizado, porém a coluna 'ativo' ainda não existe no seu Supabase. Por favor, acesse Configurações -> Banco de Dados para ver o comando SQL de atualização.");
        }
      }

      if (err) setError('Erro ao atualizar usuário. O e-mail pode já estar em uso.');
      else {
        setIsEditing(false);
        fetchData();
      }
    } else {
      let { error: err } = await supabase.from('usuarios').insert([userData]);

      if (err && err.message?.includes('column "ativo" of relation "usuarios" does not exist')) {
        const fallbackData = { ...userData };
        delete fallbackData.ativo;
        const fallbackRes = await supabase.from('usuarios').insert([fallbackData]);
        err = fallbackRes.error;
        if (!err) {
          alert("Alerta: O usuário foi criado, porém a coluna 'ativo' ainda não existe no seu Supabase. Por favor, acesse Configurações -> Banco de Dados para ver o comando SQL de atualização.");
        }
      }

      if (err) setError('Erro ao criar usuário. O e-mail pode já estar em uso.');
      else {
        setIsEditing(false);
        fetchData();
      }
    }
  };

  const handleDelete = (id: string) => {
    confirmDelete({
      message: 'Tem certeza que deseja excluir este usuário? Esta ação não poderá ser desfeita.',
      onConfirm: async () => {
        const { error } = await supabase.from('usuarios').delete().eq('id', id);
        if (error) alert('Erro ao excluir usuário.');
        else fetchData();
      }
    });
  };

  if (!user?.id_master && !user?.is_admin && !hasPermission('/usuarios')) {
    return <div className="p-8 text-center text-slate-500">Acesso negado.</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Users className="text-amber-500" />
            Cadastro de Usuários
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie os usuários do sistema e seus acessos</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => { 
              setCurrentUser({ nome: '', email: '', senha: '', id_perfil: '', id_igreja: selectedIgreja?.id || '', is_admin: false }); 
              setError('');
              setSuccess('');
              setIsEditing(true); 
            }}
            className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-amber-700 transition-colors"
          >
            <Plus size={20} />
            Novo Usuário
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">{currentUser.id ? 'Editar Usuário' : 'Novo Usuário'}</h2>
          
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg text-sm">{success}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
              <input 
                type="text" 
                value={currentUser.nome || ''} 
                onChange={(e) => setCurrentUser({...currentUser, nome: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Nome do usuário"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail ou Usuário</label>
              <input 
                type="text" 
                value={currentUser.email} 
                onChange={(e) => setCurrentUser({...currentUser, email: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="usuario ou usuario@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                Senha {currentUser.id && <span className="text-slate-400 font-normal text-xs">(Deixe em branco para não alterar)</span>}
              </label>
              <input 
                type="password" 
                value={currentUser.senha || ''} 
                onChange={(e) => setCurrentUser({...currentUser, senha: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="••••••••"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Foto de Perfil (URL ou Upload)</label>
              <div className="space-y-3">
                <input 
                  type="text" 
                  value={currentUser.foto_url || ''} 
                  onChange={(e) => setCurrentUser({...currentUser, foto_url: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="https://exemplo.com/foto.jpg"
                />

                {/* If foto_url is empty, show the Drag & Drop area */}
                {!(currentUser.foto_url && currentUser.foto_url.trim() !== '') && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!isUploading) setIsDragging(true);
                    }}
                    onDragLeave={() => {
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (isUploading) return;
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleFileSelection(Array.from(e.dataTransfer.files));
                      }
                    }}
                    onClick={() => {
                      if (!isUploading) {
                        document.getElementById('usuario-photo-upload-input')?.click();
                      }
                    }}
                    className={`p-4 rounded-xl border-2 border-dashed transition-all duration-200 text-center flex flex-col items-center justify-center gap-2 ${
                      isDragging
                        ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-955/20 cursor-pointer'
                        : isUploading
                          ? 'border-amber-500/50 bg-amber-50/5 dark:bg-amber-955/5 cursor-wait opacity-80'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:border-amber-500/55 cursor-pointer'
                    }`}
                  >
                    <input
                      type="file"
                      id="usuario-photo-upload-input"
                      className="hidden"
                      accept="image/*"
                      disabled={isUploading}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileSelection(Array.from(e.target.files));
                        }
                      }}
                    />
                    
                    {isUploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[11px] font-bold text-amber-500 animate-pulse">Enviando foto...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={20} className="text-amber-500" />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Arraste e solte a foto aqui, ou <span className="text-amber-600 dark:text-amber-400 font-bold underline">clique para selecionar</span>.
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* If foto_url has value, show a tiny preview with a clear option */}
                {currentUser.foto_url && currentUser.foto_url.trim() !== '' && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentUser.foto_url}
                      alt="Prévia"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Foto Selecionada</p>
                      <p className="text-xs text-slate-600 dark:text-slate-350 truncate">{currentUser.foto_url}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentUser(prev => ({ ...prev, foto_url: '' }))}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-955/20 rounded transition-colors"
                      title="Remover foto"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="is_admin"
                  checked={currentUser.is_admin}
                  onChange={(e) => setCurrentUser({...currentUser, is_admin: e.target.checked})}
                  className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500" 
                />
                <label htmlFor="is_admin" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Usuário Administrador (Acesso total)
                </label>
              </div>
              <div className="flex items-center gap-3 sm:border-l sm:pl-4 border-slate-200 dark:border-slate-700">
                <input 
                  type="checkbox" 
                  id="ativo"
                  checked={currentUser.ativo !== false}
                  onChange={(e) => setCurrentUser({...currentUser, ativo: e.target.checked})}
                  className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500" 
                />
                <label htmlFor="ativo" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Conta Ativa (Habilitar Acesso do Usuário)
                </label>
              </div>
            </div>

            {!currentUser.is_admin && (
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Perfil de Acesso</label>
                <select 
                  value={currentUser.id_perfil || ''} 
                  onChange={(e) => setCurrentUser({...currentUser, id_perfil: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="" disabled>Selecione um perfil</option>
                  {perfis.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-700">
            <button 
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 bg-amber-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-amber-700 transition-colors"
            >
              <Save size={20} />
              Salvar
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Carregando...</div>
          ) : usuarios.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum usuário cadastrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-400 text-sm">E-mail / Usuário</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-400 text-sm">Perfil</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-400 text-sm">Igreja</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-400 text-sm text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 border border-slate-200">
                          {u.foto_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.foto_url} alt="profile" className="w-full h-full object-cover" onError={(e) => { (e.target as any).style.display = 'none' }} />
                          ) : (
                            <div className="font-bold text-xs uppercase text-slate-500">{(u.nome || u.email).charAt(0)}</div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-950 dark:text-white leading-tight">
                            {u.nome || 'Sem Nome'}
                          </span>
                          <span className="text-xs text-slate-500 font-normal">{u.email}</span>
                        </div>
                        {(u as any).id_master && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] uppercase tracking-wider font-black rounded">Master</span>}
                        {u.is_admin && !(u as any).id_master && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] uppercase tracking-wider font-black rounded">Admin</span>}
                        {u.ativo === false ? (
                          <span className="px-2 py-0.5 bg-red-500/10 text-red-600 text-[10px] uppercase tracking-wider font-black rounded">Desabilitado</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-600 text-[10px] uppercase tracking-wider font-black rounded">Habilitado</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {(u as any).id_master || u.is_admin ? 'Acesso Total' : (u.perfil?.nome || '-')}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {(u as any).id_master ? 'Todas' : (u.igreja?.nome || '-')}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => { setCurrentUser(u); setError(''); setSuccess(''); setIsEditing(true); }}
                            className="p-2 text-slate-400 hover:text-amber-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(u.id)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            disabled={u.email === 'admin@igreja.com' || u.email === 'admin'} 
                            title={u.email.startsWith('admin') ? 'Não é possível excluir o admin principal' : ''}
                          >
                            <Trash2 size={18} className={u.email.startsWith('admin') ? 'opacity-30' : ''} />
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
      )}
    </div>
  );
}
