'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, Upload, FileText, Download } from 'lucide-react';
import { useDeputado } from '@/context/DeputadoContext';

export default function FormularioEmenda() {
  const { selectedDeputado } = useDeputado();
  const [editais, setEditais] = useState<any[]>([]);
  const [ministerios, setMinisterios] = useState<any[]>([]);
  const [acoes, setAcoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const initialFormState = {
    id_edital: '',
    id_ministerio: '',
    id_acao: '',
    nome_entidade: '',
    cnpj: '',
    nome_projeto: '',
    resumo_projeto: '',
    descricao_projeto: '',
    orcamento_url: '',
    curriculo_url: '',
    como_ficou_sabendo: '',
    concorda_regras: false,
    contato_nome: '',
    contato_telefone: '',
    contato_email: ''
  };
  
  const [formData, setFormData] = useState(initialFormState);
  
  useEffect(() => {
    async function fetchData() {
      if (!selectedDeputado) {
        setEditais([]);
        setMinisterios([]);
        setAcoes([]);
        setFetching(false);
        return;
      }
      
      setFetching(true);
      
      const today = new Date().toISOString().split('T')[0];
      
      const [minResponse, editaisResponse] = await Promise.all([
        supabase
          .from('ministerios')
          .select('id, nome')
          .eq('id_deputado', selectedDeputado.id)
          .order('nome'),
        supabase
          .from('editais')
          .select('id, titulo, arquivo_pdf_base64')
          .eq('id_deputado', selectedDeputado.id)
          .lte('data_inicio', today)
          .gte('data_fim', today)
          .order('titulo')
      ]);
      
      if (minResponse.data) {
        setMinisterios(minResponse.data);
      }
      
      if (editaisResponse.data) {
        setEditais(editaisResponse.data);
      }
      
      setFetching(false);
    }
    fetchData();
  }, [selectedDeputado]);

  useEffect(() => {
    async function fetchAcoes() {
      if (!formData.id_ministerio) {
        setAcoes([]);
        return;
      }
      
      const { data: acoesData } = await supabase
        .from('acoes')
        .select('id, nome')
        .eq('id_ministerio', formData.id_ministerio)
        .order('nome');
      
      if (acoesData) {
        setAcoes(acoesData);
      }
    }
    fetchAcoes();
  }, [formData.id_ministerio]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, field: 'orcamento_url' | 'curriculo_url') {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Por favor, selecione um arquivo PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData({ ...formData, [field]: base64String });
      alert(`Arquivo ${file.name} carregado com sucesso!`);
    };
    reader.readAsDataURL(file);
  }

  const handleDownloadEdital = () => {
    const selectedEdital = editais.find(e => e.id === formData.id_edital);
    if (!selectedEdital?.arquivo_pdf_base64) return;
    const a = document.createElement('a');
    a.href = selectedEdital.arquivo_pdf_base64;
    a.download = `Edital_${selectedEdital.titulo.replace(/\s+/g, '_')}.pdf`;
    a.click();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.id_edital || !formData.id_ministerio || !formData.id_acao) {
      alert('Selecione um edital, ministério e ação primeiro.');
      return;
    }
    
    setLoading(true);
    
    const payload = {
      id_edital: formData.id_edital,
      id_ministerio: formData.id_ministerio,
      id_acao: formData.id_acao,
      nome_entidade: formData.nome_entidade,
      cnpj: formData.cnpj,
      nome_projeto: formData.nome_projeto,
      resumo_projeto: formData.resumo_projeto,
      descricao_projeto: formData.descricao_projeto,
      orcamento_url: formData.orcamento_url,
      curriculo_url: formData.curriculo_url,
      como_ficou_sabendo: formData.como_ficou_sabendo,
      concorda_regras: formData.concorda_regras,
      contato_nome: formData.contato_nome,
      contato_telefone: formData.contato_telefone,
      contato_email: formData.contato_email
    };

    const { error } = await supabase
      .from('formularios_emenda')
      .insert([payload]);
    
    if (!error) {
      alert('Adesão Edital salva com sucesso!');
      setFormData(initialFormState);
    } else {
      alert(`Erro ao salvar adesão: ${error.message || error.details || 'Erro desconhecido'}`);
      console.error('Supabase insert error:', error);
    }
    
    setLoading(false);
  }

  if (fetching) return <div className="p-8">Carregando...</div>;

  const isFormValid = 
    formData.id_edital !== '' &&
    formData.id_ministerio !== '' &&
    formData.id_acao !== '' &&
    formData.nome_entidade.trim() !== '' &&
    formData.cnpj.trim() !== '' &&
    formData.contato_nome.trim() !== '' &&
    formData.contato_telefone.trim() !== '' &&
    formData.contato_email.trim() !== '' &&
    formData.nome_projeto.trim() !== '' &&
    formData.resumo_projeto.trim() !== '' &&
    formData.descricao_projeto.trim() !== '' &&
    formData.como_ficou_sabendo !== '' &&
    formData.orcamento_url !== '' &&
    formData.curriculo_url !== '' &&
    formData.concorda_regras === true;

  const selectedEdital = editais.find(e => e.id === formData.id_edital);

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-sm font-bold text-primary uppercase tracking-widest mb-1">
            Nova Adesão
          </p>
          <h2 className="text-2xl md:text-3xl font-black font-headline text-on-surface">
            Adesão Edital
          </h2>
        </div>
        
        {selectedEdital?.arquivo_pdf_base64 && (
          <button 
            onClick={handleDownloadEdital}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors text-sm font-bold shadow-sm border border-slate-200 w-full md:w-auto justify-center"
          >
            <Download size={16} />
            Edital Selecionado: {selectedEdital.titulo} (Baixar)
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-slate-100 space-y-6">
        <div className="grid grid-cols-1 gap-6">
          
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Selecione o Edital</label>
            <select 
              required
              className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all appearance-none"
              value={formData.id_edital}
              onChange={e => setFormData({...initialFormState, id_edital: e.target.value})}
            >
              <option value="" disabled>Selecione um edital...</option>
              {editais.map(ed => (
                <option key={ed.id} value={ed.id}>
                  {ed.titulo}
                </option>
              ))}
            </select>
          </div>

          <fieldset disabled={!formData.id_edital} className={`space-y-6 ${!formData.id_edital ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Selecione o Ministério</label>
            <select 
              required
              className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all appearance-none"
              value={formData.id_ministerio}
              onChange={e => setFormData({...formData, id_ministerio: e.target.value, id_acao: ''})}
            >
              <option value="" disabled>Selecione um ministério...</option>
              {ministerios.map(min => (
                <option key={min.id} value={min.id}>
                  {min.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Selecione a Ação</label>
            <select 
              required
              disabled={!formData.id_ministerio}
              className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all appearance-none"
              value={formData.id_acao}
              onChange={e => setFormData({...formData, id_acao: e.target.value})}
            >
              <option value="" disabled>Selecione uma ação...</option>
              {acoes.map(acao => (
                <option key={acao.id} value={acao.id}>
                  {acao.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">a) Nome da entidade ou ente público</label>
            <input 
              required
              type="text" 
              className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all"
              value={formData.nome_entidade}
              onChange={e => setFormData({...formData, nome_entidade: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">b) CNPJ</label>
            <input 
              required
              type="text" 
              className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all"
              value={formData.cnpj}
              onChange={e => setFormData({...formData, cnpj: e.target.value})}
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100/80 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-primary">Contato da Entidade</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Nome Completo</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-white border border-slate-200 focus:border-primary/40 rounded-lg px-4 py-3 text-sm outline-none transition-all"
                  value={formData.contato_nome}
                  onChange={e => setFormData({...formData, contato_nome: e.target.value})}
                  placeholder="Nome do responsável"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Telefone</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-white border border-slate-200 focus:border-primary/40 rounded-lg px-4 py-3 text-sm outline-none transition-all"
                  value={formData.contato_telefone}
                  onChange={e => setFormData({...formData, contato_telefone: e.target.value})}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">E-mail</label>
                <input 
                  required
                  type="email" 
                  className="w-full bg-white border border-slate-200 focus:border-primary/40 rounded-lg px-4 py-3 text-sm outline-none transition-all"
                  value={formData.contato_email}
                  onChange={e => setFormData({...formData, contato_email: e.target.value})}
                  placeholder="contato@entidade.org"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">c) Nome do projeto</label>
            <input 
              required
              type="text" 
              className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all"
              value={formData.nome_projeto}
              onChange={e => setFormData({...formData, nome_projeto: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">d) Resumo / Objeto do projeto (no máximo 3 linhas)</label>
            <textarea 
              required
              rows={3}
              className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all resize-none"
              value={formData.resumo_projeto}
              onChange={e => setFormData({...formData, resumo_projeto: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">e) Descrição de como pretende desenvolver o projeto</label>
            <textarea 
              required
              rows={5}
              className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all"
              value={formData.descricao_projeto}
              onChange={e => setFormData({...formData, descricao_projeto: e.target.value})}
            />
          </div>

          <div className="space-y-2">
             <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Como ficou sabendo?</label>
             <select 
               required
               className="w-full bg-surface-container-low border border-transparent focus:border-primary/40 focus:bg-white rounded-lg px-4 py-3 text-sm outline-none transition-all appearance-none"
               value={formData.como_ficou_sabendo}
               onChange={e => setFormData({...formData, como_ficou_sabendo: e.target.value})}
             >
               <option value="" disabled>Selecione uma opção...</option>
               <option value="Página Deputado(a)">Página Deputado(a)</option>
               <option value="Instagram">Instagram</option>
               <option value="Facebook">Facebook</option>
               <option value="X">X (Twitter)</option>
               <option value="Outros">Outros</option>
             </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">PROJETO:</label>
            <p className="text-xs text-slate-500 mb-2">Se possível destacar o que será destinado a custeio e / ou investimento. (Formato PDF)</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium">
                <Upload size={16} />
                Selecionar Arquivo PDF
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="hidden" 
                  onChange={e => handleFileUpload(e, 'orcamento_url')}
                />
              </label>
              {formData.orcamento_url && (
                <span className="text-sm text-primary flex items-center gap-1">
                  <FileText size={16} /> Arquivo carregado
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">g) Currículo da entidade</label>
            <p className="text-xs text-slate-500 mb-2">Comprovando sua existência, experiência com o objeto da emenda (para OSCs). (Formato PDF)</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium">
                <Upload size={16} />
                Selecionar Arquivo PDF
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="hidden" 
                  onChange={e => handleFileUpload(e, 'curriculo_url')}
                />
              </label>
              {formData.curriculo_url && (
                <span className="text-sm text-primary flex items-center gap-1">
                  <FileText size={16} /> Arquivo carregado
                </span>
              )}
            </div>
          </div>
          </fieldset>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Observação:</strong> Sugerimos consultar os tutoriais do Transferegov.br sobre os atos preparatórios antes de montar seu projeto e principalmente sua planilha de orçamento:{' '}
            <a href="https://www.gov.br/transferegov/pt-br/manuais/transferegov/discricionarias" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
              https://www.gov.br/transferegov/pt-br/manuais/transferegov/discricionarias
            </a>
          </p>
        </div>

        <div className="pt-4 flex items-center gap-3">
          <input 
            type="checkbox" 
            id="concorda"
            checked={formData.concorda_regras}
            onChange={(e) => setFormData({...formData, concorda_regras: e.target.checked})}
            className="w-5 h-5 text-primary rounded"
            disabled={!formData.id_edital}
          />
          <label htmlFor="concorda" className={`text-sm font-bold text-slate-700 select-none ${formData.id_edital ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
            De acordo com as Regras descritas no Edital
          </label>
        </div>

        <div className="pt-6 flex justify-end">
          <button 
            type="submit" 
            disabled={loading || !selectedDeputado || !isFormValid}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-white px-8 py-3 rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-md disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? 'Salvando...' : 'Salvar Adesão'}
          </button>
        </div>
      </form>
    </div>
  );
}
