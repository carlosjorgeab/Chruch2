'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useIgreja } from '@/context/IgrejaContext';
import { Plus, Edit2, Trash2, Save, Search, Users, ExternalLink, Briefcase, AlertCircle } from 'lucide-react';

type Fornecedor = {
  id: string;
  razao_social: string;
  cpf_cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
};

export default function FornecedoresPage() {
  const { user, hasPermission } = useAuth();
  const { selectedIgreja } = useIgreja();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFornecedor, setCurrentFornecedor] = useState<Partial<Fornecedor>>({
    razao_social: '',
    cpf_cnpj: '',
    endereco: '',
    telefone: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function fetchData() {
    if (!selectedIgreja) {
      setFornecedores([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      
      const { data, error: err } = await supabase
        .from('fornecedor')
        .select('*')
        .eq('id_igreja', selectedIgreja.id)
        .order('razao_social', { ascending: true });

      if (err) throw err;
      setFornecedores(data || []);
    } catch (e: any) {
      console.error(e);
      setError('Erro ao carregar fornecedores: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [selectedIgreja]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFornecedor.razao_social) {
      setError('A Razão Social é obrigatória.');
      return;
    }
    if (!selectedIgreja) {
      setError('Selecione uma igreja no menu superior para salvar.');
      return;
    }

    try {
      setError('');
      setSuccess('');

      const payload = {
        id_igreja: selectedIgreja.id,
        razao_social: currentFornecedor.razao_social,
        cpf_cnpj: currentFornecedor.cpf_cnpj || null,
        endereco: currentFornecedor.endereco || null,
        telefone: currentFornecedor.telefone || null,
        email: currentFornecedor.email || null,
      };

      let saveError = null;

      if (currentFornecedor.id) {
        const { error: err } = await supabase
          .from('fornecedor')
          .update(payload)
          .eq('id', currentFornecedor.id);
        saveError = err;
      } else {
        const { error: err } = await supabase
          .from('fornecedor')
          .insert([payload]);
        saveError = err;
      }

      if (saveError) {
        throw saveError;
      }

      setSuccess('Fornecedor salvo com sucesso!');
      setIsEditing(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao salvar fornecedor: ' + (err?.message || err));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o fornecedor "${name}"?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      const { error: err } = await supabase
        .from('fornecedor')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setSuccess('Fornecedor excluído com sucesso!');
      fetchData();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao excluir fornecedor: ' + (err?.message || err));
    }
  };

  const filteredFornecedores = fornecedores.filter(f => {
    const search = searchTerm.toLowerCase();
    return (
      f.razao_social.toLowerCase().includes(search) ||
      (f.cpf_cnpj?.toLowerCase().includes(search) ?? false) ||
      (f.email?.toLowerCase().includes(search) ?? false)
    );
  });

  if (!user?.is_admin && !hasPermission('/fornecedores')) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-20">
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-3xl p-12 shadow-sm space-y-4 max-w-xl mx-auto">
          <div className="p-4 bg-red-100 dark:bg-red-900/40 rounded-full w-16 h-16 flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-850 dark:text-white">Acesso Negado</h3>
          <p className="text-sm text-slate-550 dark:text-slate-400 leading-relaxed">
            Você não possui permissão para acessar o cadastro de Fornecedores. Entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  if (!selectedIgreja) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-20">
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-3xl p-12 shadow-sm space-y-4 max-w-xl mx-auto">
          <div className="p-4 bg-amber-100 dark:bg-amber-900/40 rounded-full w-16 h-16 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-850 dark:text-white">Nenhuma Congregação Selecionada</h3>
          <p className="text-sm text-slate-550 dark:text-slate-400 leading-relaxed">
            Selecione uma congregação no seletor no menu lateral para visualizar, cadastrar e gerenciar fornecedores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Briefcase className="text-amber-500" />
            Cadastro de Fornecedores
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie prestadores de serviços, credores e fornecedores</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => { 
              setCurrentFornecedor({ razao_social: '', cpf_cnpj: '', endereco: '', telefone: '', email: '' }); 
              setIsEditing(true); 
              setError('');
              setSuccess('');
            }}
            className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-amber-700 transition-colors"
          >
            <Plus size={20} />
            Novo Fornecedor
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-lg text-sm font-semibold">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900 rounded-lg text-sm font-semibold">{success}</div>}

      {isEditing ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">{currentFornecedor.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
          
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Razão Social / Nome completo *</label>
                <input 
                  type="text" 
                  value={currentFornecedor.razao_social || ''} 
                  onChange={(e) => setCurrentFornecedor({...currentFornecedor, razao_social: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                  placeholder="Nome de Fornecedor ou Empresa"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">CPF / CNPJ</label>
                <input 
                  type="text" 
                  value={currentFornecedor.cpf_cnpj || ''} 
                  onChange={(e) => setCurrentFornecedor({...currentFornecedor, cpf_cnpj: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="00.000.000/0001-00 ou 000.000.000-00"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone de Contato</label>
                <input 
                  type="text" 
                  value={currentFornecedor.telefone || ''} 
                  onChange={(e) => setCurrentFornecedor({...currentFornecedor, telefone: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail</label>
                <input 
                  type="email" 
                  value={currentFornecedor.email || ''} 
                  onChange={(e) => setCurrentFornecedor({...currentFornecedor, email: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="email@fornecedor.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Endereço Completo</label>
                <input 
                  type="text" 
                  value={currentFornecedor.endereco || ''} 
                  onChange={(e) => setCurrentFornecedor({...currentFornecedor, endereco: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="Rua, Número, Bairro, Cidade - Estado"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-700">
              <button 
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="flex items-center gap-2 bg-amber-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-amber-700 transition-colors"
              >
                <Save size={20} />
                Salvar
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 items-center justify-between shadow-sm">
            <div className="relative flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg px-4 py-1.5 w-full max-w-md border border-slate-200 dark:border-slate-800">
              <Search className="text-slate-400 mr-2" size={16} />
              <input 
                className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none text-slate-800 dark:text-white" 
                placeholder="Pesquisar fornecedor..." 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Carregando...</div>
            ) : filteredFornecedores.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Nenhum fornecedor encontrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                      <th className="p-4 font-bold text-slate-600 dark:text-slate-400 text-sm">Razão Social</th>
                      <th className="p-4 font-bold text-slate-600 dark:text-slate-400 text-sm">CPF/CNPJ</th>
                      <th className="p-4 font-bold text-slate-600 dark:text-slate-400 text-sm">E-mail</th>
                      <th className="p-4 font-bold text-slate-600 dark:text-slate-400 text-sm">Telefone</th>
                      <th className="p-4 font-bold text-slate-600 dark:text-slate-400 text-sm">Endereço</th>
                      <th className="p-4 font-bold text-slate-600 dark:text-slate-400 text-sm text-right font-sans">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFornecedores.map(f => (
                      <tr key={f.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                          {f.razao_social}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400 text-sm font-mono">
                          {f.cpf_cnpj || '-'}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400 text-sm">
                          {f.email || '-'}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400 text-sm font-sans">
                          {f.telefone || '-'}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400 text-sm max-w-xs truncate">
                          {f.endereco || '-'}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => { setCurrentFornecedor(f); setIsEditing(true); setError(''); setSuccess(''); }}
                              className="p-2 text-slate-400 hover:text-amber-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDelete(f.id, f.razao_social)}
                              className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              <Trash2 size={18} />
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
