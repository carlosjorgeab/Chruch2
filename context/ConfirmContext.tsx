'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import { AlertCircle, X } from 'lucide-react';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
};

type ConfirmContextType = {
  confirmDelete: (options: ConfirmOptions) => void;
};

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ConfirmOptions | null>(null);
  const [isPending, setIsPending] = useState(false);

  const confirmDelete = (options: ConfirmOptions) => {
    setActiveModal(options);
  };

  const handleClose = () => {
    if (!isPending) {
      setActiveModal(null);
    }
  };

  const handleConfirm = async () => {
    if (!activeModal) return;
    try {
      setIsPending(true);
      await activeModal.onConfirm();
    } catch (err) {
      console.error("Erro na confirmação de exclusão:", err);
    } finally {
      setIsPending(false);
      setActiveModal(null);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirmDelete }}>
      {children}

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-205 dark:border-slate-800 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
            id="confirm-delete-modal"
          >
            {/* Header with absolute cancel */}
            <button
              onClick={handleClose}
              disabled={isPending}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 transition-colors disabled:opacity-50"
              title="Fechar"
            >
              <X size={16} />
            </button>

            {/* Content area */}
            <div className="p-6 pt-8 text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center text-red-600 dark:text-red-450 animate-bounce">
                <AlertCircle size={24} />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold font-sans text-slate-900 dark:text-white leading-tight">
                  {activeModal.title || 'Aviso de Exclusão'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans max-w-sm mx-auto leading-relaxed">
                  {activeModal.message}
                </p>
              </div>
            </div>

            {/* Controls panel */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-850 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs rounded-xl font-bold font-sans transition-all active:scale-95 disabled:opacity-50 select-none cursor-pointer"
              >
                {activeModal.cancelLabel || 'Cancelar'}
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded-xl font-bold font-sans transition-all active:scale-95 disabled:opacity-50 select-none cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isPending ? 'Excluindo...' : (activeModal.confirmLabel || 'Confirmar Exclusão')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm deve ser usado sob ConfirmProvider');
  }
  return context;
}
