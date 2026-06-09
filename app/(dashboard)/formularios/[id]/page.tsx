'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Download, FileText, Building2, User, Landmark, ClipboardList, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function DetalhesAdesao() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubmission() {
      const id = params?.id;
      if (!id) return;
      
      setLoading(true);
      const { data, error } = await supabase
        .from('formularios_emenda')
        .select(`
          *,
          editais (titulo),
          ministerios (nome),
          acoes (nome)
        `)
        .eq('id', id)
        .single();
        
      if (error) {
        console.error('Error fetching submission:', error);
        setError('Não foi possível carregar os detalhes desta adesão.');
      } else {
        setSubmission(data);
      }
      setLoading(false);
    }
    
    fetchSubmission();
  }, [params]);

  const handleDownload = (base64: string, filename: string) => {
    const a = document.createElement('a');
    a.href = base64;
    a.download = filename;
    a.click();
  };

  if (loading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Carregando detalhes...</p>
    </div>
  );

  if (error || !submission) return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-red-50 border border-red-200 p-8 rounded-3xl text-center">
        <p className="text-red-600 font-bold">{error || 'Adesão não encontrada.'}</p>
        <button onClick={() => router.back()} className="mt-4 text-primary font-bold hover:underline flex items-center gap-2 justify-center mx-auto">
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors border-2 border-slate-100"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">Adesão Edital #ID {submission.id.split('-')[0]}</p>
            <h2 className="text-3xl font-black font-headline text-slate-900 uppercase tracking-tight">Detalhes da Proposta</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Informações da Entidade */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Building2 size={20} />
              </div>
              <h3 className="text-lg font-black font-headline text-slate-900 uppercase">Informações da Entidade</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Entidade</p>
                <p className="font-bold text-slate-700">{submission.nome_entidade}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CNPJ</p>
                <p className="font-bold text-slate-700">{submission.cnpj}</p>
              </div>
              <div className="space-y-1 col-span-1 md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                <p className="text-xs font-black text-primary uppercase tracking-widest mb-3">Informações de Contato</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Contato</p>
                    <p className="font-bold text-slate-750">{submission.contato_nome || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</p>
                    <p className="font-bold text-slate-700">{submission.contato_telefone || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</p>
                    <p className="font-bold text-slate-700">{submission.contato_email || '-'}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1 border-t border-slate-100 pt-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Como ficou sabendo</p>
                <p className="font-bold text-slate-700">{submission.como_ficou_sabendo}</p>
              </div>
              <div className="space-y-1 border-t border-slate-100 pt-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Envio</p>
                <p className="font-bold text-slate-700">{new Date(submission.created_at).toLocaleDateString('pt-BR')} às {new Date(submission.created_at).toLocaleTimeString('pt-BR')}</p>
              </div>
            </div>
          </div>

          {/* Detalhes do Projeto */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                <ClipboardList size={20} />
              </div>
              <h3 className="text-lg font-black font-headline text-slate-900 uppercase">Detalhes do Projeto</h3>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título do Projeto</p>
                <p className="text-xl font-black text-slate-900">{submission.nome_projeto}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo / Objeto</p>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-slate-600 font-medium whitespace-pre-wrap">
                  {submission.resumo_projeto}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição Completa</p>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                  {submission.descricao_projeto}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Classificação */}
          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl space-y-6">
             <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <Landmark size={20} className="text-primary" />
              <h3 className="text-lg font-black font-headline uppercase">Vínculo</h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Edital</p>
                <p className="font-bold text-sm text-primary">{submission.editais?.titulo}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ministério</p>
                <p className="font-bold text-sm">{submission.ministerios?.nome}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ação</p>
                <p className="font-bold text-sm">{submission.acoes?.nome}</p>
              </div>
            </div>
          </div>

          {/* Arquivos */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
             <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                <FileText size={20} />
              </div>
              <h3 className="text-lg font-black font-headline text-slate-900 uppercase">Documentos</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {submission.orcamento_url && (
                <button 
                  onClick={() => handleDownload(submission.orcamento_url, `Orcamento_${submission.nome_entidade.replace(/\s+/g, '_')}.pdf`)}
                  className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-primary border border-slate-100 group-hover:scale-110 transition-transform">
                      <Download size={14} />
                    </div>
                    <span className="text-xs font-bold text-slate-700">Planilha de Orçamento</span>
                  </div>
                  <FileText size={14} className="text-slate-300" />
                </button>
              )}

              {submission.curriculo_url && (
                <button 
                  onClick={() => handleDownload(submission.curriculo_url, `Curriculo_${submission.nome_entidade.replace(/\s+/g, '_')}.pdf`)}
                  className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-primary border border-slate-100 group-hover:scale-110 transition-transform">
                      <Download size={14} />
                    </div>
                    <span className="text-xs font-bold text-slate-700">Currículo da Entidade</span>
                  </div>
                  <FileText size={14} className="text-slate-300" />
                </button>
              )}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl flex gap-4 text-amber-800">
             <Info size={24} className="shrink-0" />
             <div className="space-y-1">
                <p className="font-black text-[10px] uppercase tracking-widest">Termos e Condições</p>
                <p className="text-[10px] font-medium italic">
                  A entidade declarou estar de acordo com as regras descritas no edital no momento da submissão.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
