'use client';

import { useState, useEffect, useRef } from 'react';
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
  Megaphone, 
  Calendar, 
  Link2, 
  Upload, 
  FileText, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Video, 
  FileCheck,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

type MuralAviso = {
  id: string;
  id_igreja: string;
  titulo: string;
  url_midia: string | null;
  arquivo_nome: string | null;
  arquivo_base64: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  status: 'Publicado' | 'Desativado';
  notificar_automatico?: boolean;
  tempo_transicao?: number;
  created_at?: string;
};

export default function MuralPage() {
  const { selectedIgreja } = useIgreja();
  const { confirmDelete } = useConfirm();
  const [murais, setMurais] = useState<MuralAviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [currentMural, setCurrentMural] = useState<Partial<MuralAviso>>({
    titulo: '',
    url_midia: '',
    arquivo_nome: '',
    arquivo_base64: '',
    data_inicio: '',
    data_fim: '',
    status: 'Publicado',
    notificar_automatico: true,
    tempo_transicao: 10
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLocalMode, setIsLocalMode] = useState(false);

  // Embedded Media Helper Functions
  const isYouTube = (url: string | null | undefined) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const getYouTubeEmbedUrl = (url: string | null | undefined) => {
    if (!url) return null;
    let videoId = '';
    try {
      if (url.includes('youtube.com/shorts/')) {
        videoId = url.split('youtube.com/shorts/')[1]?.split('?')[0] || '';
      } else if (url.includes('youtube.com/live/')) {
        videoId = url.split('youtube.com/live/')[1]?.split('?')[0] || '';
      } else if (url.includes('youtube.com/watch')) {
        const urlParams = new URL(url).searchParams;
        videoId = urlParams.get('v') || '';
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('youtube.com/embed/')[1]?.split('?')[0] || '';
      } else {
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?"\s]{11})/);
        if (match) videoId = match[1];
      }
    } catch (err) {
      if (url.includes('v=')) {
        videoId = url.split('v=')[1]?.split('&')[0] || '';
      }
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const isVimeo = (url: string | null | undefined) => {
    if (!url) return false;
    return url.includes('vimeo.com');
  };

  const getVimeoEmbedUrl = (url: string | null | undefined) => {
    if (!url) return null;
    try {
      const match = url.match(/vimeo\.com\/(\d+)/);
      return match ? `https://player.vimeo.com/video/${match[1]}` : null;
    } catch {
      return null;
    }
  };

  const isDirectVideo = (url: string | null | undefined) => {
    if (!url) return false;
    return !!url.match(/\.(mp4|webm|ogg)$/i);
  };

  useEffect(() => {
    if (selectedIgreja) {
      fetchMurais();
    } else {
      setMurais([]);
      setLoading(false);
    }
  }, [selectedIgreja]);

  async function fetchMurais() {
    if (!selectedIgreja) return;
    try {
      setLoading(true);
      setError('');
      setIsLocalMode(false);

      const { data, error: err } = await supabase
        .from('mural_avisos')
        .select('*')
        .eq('id_igreja', selectedIgreja.id)
        .order('created_at', { ascending: false });

      if (err) {
        console.warn('Tabela mural_avisos não encontrada ou erro RPC:', err.message);
        // Fallback to local storage
        setIsLocalMode(true);
        const localData = typeof window !== 'undefined' ? localStorage.getItem(`mural_avisos_${selectedIgreja.id}`) : null;
        if (localData) {
          setMurais(JSON.parse(localData));
        } else {
          setMurais([]);
        }
      } else if (data) {
        setMurais(data as MuralAviso[]);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`mural_avisos_${selectedIgreja.id}`, JSON.stringify(data));
        }
      }
    } catch (e: any) {
      console.error('Erro de rede carregando avisos:', e);
      setIsLocalMode(true);
      const localData = typeof window !== 'undefined' ? localStorage.getItem(`mural_avisos_${selectedIgreja.id}`) : null;
      if (localData) {
        setMurais(JSON.parse(localData));
      }
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (mural: MuralAviso) => {
    setCurrentMural({
      ...mural,
      notificar_automatico: mural.notificar_automatico !== false,
      tempo_transicao: mural.tempo_transicao ?? 10
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
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    setCurrentMural({
      id_igreja: selectedIgreja.id,
      titulo: '',
      url_midia: '',
      arquivo_nome: '',
      arquivo_base64: '',
      data_inicio: todayStr,
      data_fim: nextWeekStr,
      status: 'Publicado',
      notificar_automatico: true,
      tempo_transicao: 10
    });
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = (id: string, titulo: string) => {
    confirmDelete({
      message: `Deseja realmente excluir o aviso "${titulo}" do mural? Esta ação não poderá ser desfeita.`,
      onConfirm: async () => {
        try {
          let hasSucceeded = false;
          if (!isLocalMode) {
            const { error: err } = await supabase.from('mural_avisos').delete().eq('id', id);
            if (!err) {
              hasSucceeded = true;
            } else {
              console.warn('Erro ao deletar no Supabase, tentando localmente:', err.message);
            }
          }

          if (isLocalMode || !hasSucceeded) {
            // Local state delete
            const filtered = murais.filter(m => m.id !== id);
            setMurais(filtered);
            if (selectedIgreja && typeof window !== 'undefined') {
              localStorage.setItem(`mural_avisos_${selectedIgreja.id}`, JSON.stringify(filtered));
            }
          }

          setSuccess('Aviso excluído com sucesso!');
          fetchMurais();
        } catch (e: any) {
          setError('Erro ao excluir aviso: ' + (e.message || e));
        }
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('O arquivo é muito grande. O tamanho máximo permitido é 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentMural({
          ...currentMural,
          arquivo_nome: file.name,
          arquivo_base64: reader.result as string
        });
        setSuccess('Arquivo anexado com sucesso!');
      };
      reader.onerror = () => {
        setError('Erro ao processar o arquivo.');
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
    setCurrentMural({
      ...currentMural,
      arquivo_nome: '',
      arquivo_base64: ''
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedIgreja) {
      setError('Selecione uma congregação.');
      return;
    }

    if (!currentMural.titulo) {
      setError('O título do aviso é obrigatório.');
      return;
    }

    const payload: any = {
      id_igreja: selectedIgreja.id,
      titulo: currentMural.titulo,
      url_midia: currentMural.url_midia || null,
      arquivo_nome: currentMural.arquivo_nome || null,
      arquivo_base64: currentMural.arquivo_base64 || null,
      data_inicio: currentMural.data_inicio || null,
      data_fim: currentMural.data_fim || null,
      status: currentMural.status || 'Publicado',
      notificar_automatico: currentMural.notificar_automatico !== false,
      tempo_transicao: currentMural.tempo_transicao || 10
    };

    try {
      let isSupabaseSuccess = false;

      if (!isLocalMode) {
        if (currentMural.id) {
          const { error: err } = await supabase
            .from('mural_avisos')
            .update(payload)
            .eq('id', currentMural.id);
          if (!err) isSupabaseSuccess = true;
          else console.warn('Supabase update failed, saving locally:', err.message);
        } else {
          const { error: err } = await supabase.from('mural_avisos').insert(payload);
          if (!err) isSupabaseSuccess = true;
          else console.warn('Supabase insert failed, saving locally:', err.message);
        }
      }

      if (isLocalMode || !isSupabaseSuccess) {
        // Save to LocalState fallback
        let updatedList: MuralAviso[] = [];
        if (currentMural.id) {
          updatedList = murais.map(m => m.id === currentMural.id ? { ...m, ...payload } : m);
        } else {
          const newLocalMural: MuralAviso = {
            id: 'local-' + Date.now().toString(),
            created_at: new Date().toISOString(),
            ...payload
          };
          updatedList = [newLocalMural, ...murais];
        }
        setMurais(updatedList);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`mural_avisos_${selectedIgreja.id}`, JSON.stringify(updatedList));
        }
        setSuccess('Aviso salvo com sucesso no armazenamento local do navegador!');
      } else {
        setSuccess('Aviso salvo e publicado com sucesso!');
      }

      setIsEditing(false);
      fetchMurais();
    } catch (e: any) {
      setError('Erro ao salvar aviso: ' + (e.message || e));
    }
  };

  const filteredMurais = murais.filter(m =>
    m.titulo.toLowerCase().includes(search.toLowerCase()) ||
    (m.url_midia && m.url_midia.toLowerCase().includes(search.toLowerCase())) ||
    (m.arquivo_nome && m.arquivo_nome.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-1">Mural e Anúncios Multimídia</p>
          <h2 className="text-3xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight">Mural de Avisos</h2>
          <p className="text-slate-500 text-sm">
            Gerencie avisos, vídeos e campanhas exibidas no topo da Visão Geral da congregação {selectedIgreja?.nome || ''}
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={handleNew}
            disabled={!selectedIgreja}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-md transition active:scale-95 text-sm uppercase tracking-wider cursor-pointer"
          >
            <Plus size={18} />
            Novo Aviso
          </button>
        )}
      </div>

      {isLocalMode && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-750 dark:text-amber-400 text-xs font-semibold">
          ⚠️ Modo Off-line Ativo: Salvando os dados localmente no navegador!
        </div>
      )}

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
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-800 pb-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Megaphone className="text-amber-600" size={22} />
              {currentMural.id ? 'Editar Aviso' : 'Adicionar Novo Aviso ao Mural'}
            </h3>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Título do Aviso / Evento *
              </label>
              <input
                type="text"
                required
                value={currentMural.titulo || ''}
                onChange={(e) => setCurrentMural({ ...currentMural, titulo: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                placeholder="Ex. Grande Culto de Celebração de Jovens ou Campanha do Agasalho"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Link da Mídia / Vídeo (YouTube, Vimeo, mp4 ou imagem remota)
              </label>
              <div className="relative">
                <Link2 size={18} className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  type="url"
                  value={currentMural.url_midia || ''}
                  onChange={(e) => setCurrentMural({ ...currentMural, url_midia: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                  placeholder="https://youtube.com/watch?v=... ou https://link-para-arquivo.pdf"
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 ml-1">
                Se você incluir um link do YouTube, o sistema criará automaticamente um reprodutor direto e destacado no centro dos avisos!
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Upload de Arquivo (Banner, Imagem ou PDF)
              </label>
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-slate-50 dark:bg-slate-950 text-center space-y-3 relative">
                <input
                  type="file"
                  id="announcement-file"
                  ref={fileInputRef}
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {currentMural.arquivo_nome ? (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl">
                      <FileCheck size={32} />
                    </div>
                    <div className="text-sm font-bold text-slate-850 dark:text-white truncate max-w-[300px]">
                      {currentMural.arquivo_nome}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={clearFile}
                        className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                      >
                        Remover Arquivo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl">
                      <Upload size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Arraste ou clique para fazer upload de um Banner ou PDF
                    </p>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500">
                      Formatos: PNG, JPG ou PDF. Tamanho máximo recomendável: 5MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Início da Vinculação (Visão Geral)
              </label>
              <div className="relative">
                <Calendar size={18} className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  type="date"
                  required
                  value={currentMural.data_inicio || ''}
                  onChange={(e) => setCurrentMural({ ...currentMural, data_inicio: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Fim da Vinculação (Visão Geral)
              </label>
              <div className="relative">
                <Calendar size={18} className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  type="date"
                  required
                  value={currentMural.data_fim || ''}
                  onChange={(e) => setCurrentMural({ ...currentMural, data_fim: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Status de Publicação
              </label>
              <div className="flex gap-4 pt-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="status"
                    value="Publicado"
                    checked={currentMural.status === 'Publicado'}
                    onChange={() => setCurrentMural({ ...currentMural, status: 'Publicado' })}
                    className="accent-amber-500 w-4 h-4"
                  />
                  Publicado
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="status"
                    value="Desativado"
                    checked={currentMural.status === 'Desativado'}
                    onChange={() => setCurrentMural({ ...currentMural, status: 'Desativado' })}
                    className="accent-amber-500 w-4 h-4"
                  />
                  Desativado
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Tempo de Transição (segundos)
              </label>
              <div className="relative">
                <RefreshCw size={18} className="absolute left-3 top-3.5 text-slate-400 font-bold animate-spin-slow" />
                <input
                  type="number"
                  min="2"
                  max="300"
                  required
                  value={currentMural.tempo_transicao || 10}
                  onChange={(e) => setCurrentMural({ ...currentMural, tempo_transicao: parseInt(e.target.value) || 10 })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 transition-all outline-none font-bold"
                  placeholder="Ex: 10"
                />
              </div>
            </div>

            <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-800 pt-5">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Configurar Notificação Automática
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentMural.notificar_automatico !== false}
                  onChange={(e) => setCurrentMural({ ...currentMural, notificar_automatico: e.target.checked })}
                  className="accent-amber-500 w-5 h-5 mt-0.5 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-slate-850 dark:text-white">Notificar automaticamente ao publicar ou atualizar</p>
                  <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed">Quando este aviso estiver ativo e dentro do período de publicação, um alerta com o título do aviso será mostrado na barra de notificações de todos os membros nos painéis superiores.</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end items-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 flex-wrap">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-955/40 text-amber-600 border border-amber-250 dark:border-amber-900/40 px-6 py-3 rounded-xl font-bold transition-all uppercase text-xs tracking-wider cursor-pointer ml-0 mr-auto"
              title="Ver demonstração em tempo real"
            >
              <Eye size={15} />
              Pré-visualizar
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-6 py-3 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 transition-all uppercase text-xs tracking-wider cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:opacity-90 uppercase text-xs tracking-widest cursor-pointer"
            >
              <Save size={16} />
              Salvar Aviso
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar título, link ou arquivos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-amber-500 transition-all"
            />
          </div>

          {loading ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin" />
              Carregando mural...
            </div>
          ) : filteredMurais.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm p-12 text-center text-slate-500 font-medium">
              Nenhum aviso cadastrado no mural desta congregação.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMurais.map((m) => {
                const isActive = m.status === 'Publicado';
                return (
                  <div key={m.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between hover:border-slate-350 dark:hover:border-slate-700 transition">
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600' : 'bg-slate-150 dark:bg-slate-800 text-slate-400'}`}>
                          <Megaphone size={22} />
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(m)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-50 dark:hover:bg-slate-850 transition rounded-lg cursor-pointer"
                            title="Editar Aviso"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id, m.titulo)}
                            className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-slate-50 dark:hover:bg-slate-850 transition rounded-lg cursor-pointer"
                            title="Excluir Aviso"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-md font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-2">{m.titulo}</h4>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider mt-1">
                          {isActive ? (
                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1"><Eye size={12} /> Ativo</span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1"><EyeOff size={12} /> Desativado</span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <Calendar size={14} className="text-amber-600 shrink-0" />
                          <span>Período: {m.data_inicio ? new Date(m.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : '-'} até {m.data_fim ? new Date(m.data_fim + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</span>
                        </div>
                        {m.url_midia && (
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-full">
                            <Video size={14} className="text-slate-400 shrink-0" />
                            <a href={m.url_midia} target="_blank" rel="noreferrer" className="text-amber-600 hover:underline truncate">
                              {m.url_midia}
                            </a>
                          </div>
                        )}
                        {m.arquivo_nome && (
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <FileText size={14} className="text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]" title={m.arquivo_nome}>{m.arquivo_nome}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                      <span>DATA CADASTRO</span>
                      <span>{m.created_at ? new Date(m.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-6 relative animate-in zoom-in-95 duration-205">
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute right-6 top-6 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer transition"
              title="Fechar Pré-visualização"
            >
              <X size={20} />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Mural Simulador</span>
              <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase">Pré-visualização do Aviso</h3>
              <p className="text-slate-500 text-xs font-medium">Veja exatamente como os seus membros visualizarão este anúncio em tempo real no topo da Visão Geral</p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-955/20 p-4 rounded-xl border border-dashed border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 text-xs font-semibold leading-relaxed">
              ℹ️ Esta é uma demonstração fiel baseada nas regras de tamanho e mídia do componente principal. Todos os botões, reprodutores de mídia e links abaixo são interativos e estão prontos para serem testados.
            </div>

            {/* Simulated Active Aviso Section */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm overflow-hidden border-2 border-amber-500/25">
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div>
                    <div className="flex items-center gap-2 text-slate-800 dark:text-white">
                      <Megaphone className="text-amber-500 shrink-0" size={18} />
                      <h3 className="text-sm font-black uppercase tracking-wider font-headline">Mural de Avisos & Anúncios</h3>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-1 font-medium">Fique por dentro das últimas novidades, vídeos e eventos da nossa congregação</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900/30 px-2.5 py-1 rounded-md tracking-wider">
                      MODO DE SIMULAÇÃO
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Media Column (100% width, compact height) */}
                  {(currentMural.url_midia || currentMural.arquivo_base64) && (
                    <div className="w-full relative h-[250px] md:h-[300px] rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 shadow-inner flex flex-col justify-center items-center">
                      {/* 1. YouTube Video */}
                      {currentMural.url_midia && isYouTube(currentMural.url_midia) && getYouTubeEmbedUrl(currentMural.url_midia) && (
                        <div className="w-full h-0 pb-[56.25%] relative bg-black">
                          <iframe
                            src={getYouTubeEmbedUrl(currentMural.url_midia)!}
                            title="Player de Vídeo"
                            className="absolute top-0 left-0 w-full h-full border-0"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        </div>
                      )}

                      {/* 2. Vimeo Video */}
                      {currentMural.url_midia && isVimeo(currentMural.url_midia) && getVimeoEmbedUrl(currentMural.url_midia) && (
                        <div className="w-full h-0 pb-[56.25%] relative bg-black">
                          <iframe
                            src={getVimeoEmbedUrl(currentMural.url_midia)!}
                            title="Player Vimeo"
                            className="absolute top-0 left-0 w-full h-full border-0"
                            allowFullScreen
                            allow="autoplay; fullscreen; picture-in-picture"
                          />
                        </div>
                      )}

                      {/* 3. Direct HTML5 Video */}
                      {currentMural.url_midia && isDirectVideo(currentMural.url_midia) && (
                        <video controls className="w-full h-full max-h-[300px] bg-black">
                          <source src={currentMural.url_midia} />
                          Seu navegador não suporta a tag de vídeo HTML5.
                        </video>
                      )}

                      {/* 4. Image base64 Uploaded file (with link overlay if present) */}
                      {!(currentMural.url_midia && (isYouTube(currentMural.url_midia) || isVimeo(currentMural.url_midia) || isDirectVideo(currentMural.url_midia))) && currentMural.arquivo_base64 && currentMural.arquivo_base64.startsWith('data:image/') && (
                        currentMural.url_midia ? (
                          <a
                            href={currentMural.url_midia}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full h-full block relative group overflow-hidden cursor-pointer"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={currentMural.arquivo_base64}
                              alt={currentMural.titulo}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-270 flex items-center justify-center">
                              <div className="bg-amber-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg uppercase tracking-wider">
                                <ExternalLink size={14} />
                                Acessar Link Anexo
                              </div>
                            </div>
                            <div className="absolute bottom-3 right-3 bg-slate-900/85 backdrop-blur-sm text-amber-405 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 z-10">
                              <ExternalLink size={10} />
                              Clique para abrir o link
                            </div>
                          </a>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={currentMural.arquivo_base64}
                            alt={currentMural.titulo}
                            className="w-full h-full object-cover"
                          />
                        )
                      )}

                      {/* 5. PDF Uploaded file */}
                      {!(currentMural.url_midia && (isYouTube(currentMural.url_midia) || isVimeo(currentMural.url_midia) || isDirectVideo(currentMural.url_midia))) && currentMural.arquivo_base64 && currentMural.arquivo_base64.startsWith('data:application/pdf') && (
                        <div className="p-8 text-center space-y-4 flex flex-col justify-center items-center h-full w-full">
                          <div className="p-4 bg-amber-50 dark:bg-amber-955/20 text-amber-600 rounded-2xl">
                            <FileText size={36} />
                          </div>
                          <p className="text-sm font-bold text-slate-850 dark:text-white truncate max-w-md">
                            {currentMural.arquivo_nome || 'documento_anexo.pdf'}
                          </p>
                          <a
                            href={currentMural.arquivo_base64}
                            download={currentMural.arquivo_nome || 'anuncio.pdf'}
                            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-6 rounded-xl shadow transition duration-200 uppercase text-xs tracking-wider cursor-pointer font-sans"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download size={14} /> Download PDF Anexo
                          </a>
                        </div>
                      )}

                      {/* 6. Generic Link / External file */}
                      {!(currentMural.url_midia && (isYouTube(currentMural.url_midia) || isVimeo(currentMural.url_midia) || isDirectVideo(currentMural.url_midia))) && currentMural.url_midia && !currentMural.arquivo_base64 && (
                        <div className="p-8 text-center space-y-4 flex flex-col justify-center items-center h-full w-full">
                          <div className="p-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-550 rounded-2xl">
                            <ExternalLink size={36} />
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-405 font-medium">Link anexado para visualização:</p>
                          <a
                            href={currentMural.url_midia}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-655 hover:underline text-sm font-extrabold max-w-md truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {currentMural.url_midia}
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Under media elements: Title and Navigation Controls */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
                    <h4 className="text-xl sm:text-2xl font-black font-headline text-slate-900 dark:text-white uppercase tracking-tight leading-tight flex-1 line-clamp-1">
                      {currentMural.titulo || 'Mural de Avisos & Anúncios'}
                    </h4>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                        ⏱️ {currentMural.tempo_transicao || 10}s
                      </span>
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 p-1.5 rounded-xl">
                        <button type="button" className="p-1 px-2 rounded-lg text-slate-350 cursor-not-allowed" disabled>
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-bold text-slate-400 px-1">
                          1 / 1
                        </span>
                        <button type="button" className="p-1 px-2 rounded-lg text-slate-350 cursor-not-allowed" disabled>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="bg-slate-900 hover:bg-slate-805 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-extrabold px-8 py-3.5 rounded-xl shadow-md transition uppercase text-xs tracking-widest cursor-pointer"
              >
                Voltar ao Formulário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
