/**
 * Sloth Stacked Toast Container Component
 * Neobrutalist stacked bottom-right toasts with tactile offset borders.
 * Uses motion/react for spring transitions and respects prefers-reduced-motion.
 */

import { FC } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, RotateCcw, X } from 'lucide-react';
import { useToastStore, ToastItem } from '@/stores/toastStore';
import { Button } from './Button';
import { cn } from '@/lib/utils';

export const ToastContainer: FC = () => {
  const { toasts, removeToast } = useToastStore();
  const prefersReduced = useReducedMotion();

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full font-sans"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const isUndo = toast.type === 'undo';
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';

          return (
            <motion.div
              key={toast.id}
              layout
              initial={
                prefersReduced
                  ? { opacity: 0 }
                  : { opacity: 0, y: 15, scale: 0.95 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                prefersReduced
                  ? { opacity: 0 }
                  : { opacity: 0, y: 10, scale: 0.95 }
              }
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className={cn(
                'pointer-events-auto flex items-center justify-between gap-3 p-3 rounded-md border-2 border-border shadow-[3px_3px_0px_var(--border)] surface-raised text-foreground select-none'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="shrink-0">
                  {isUndo ? (
                    <RotateCcw size={16} className="text-[var(--primary)]" />
                  ) : isSuccess ? (
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  ) : isError ? (
                    <AlertCircle size={16} className="text-red-500" />
                  ) : (
                    <Info size={16} className="text-[var(--primary)]" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate leading-tight">
                    {toast.title}
                  </div>
                  {toast.message && (
                    <div className="text-[11px] opacity-75 truncate mt-0.5 leading-tight">
                      {toast.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isUndo && toast.onAction && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      toast.onAction?.();
                      removeToast(toast.id);
                    }}
                    className="h-7 px-2.5 py-0 text-xs font-bold rounded cursor-pointer"
                  >
                    {toast.actionLabel || 'Undo'}
                  </Button>
                )}

                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="size-6 flex items-center justify-center rounded text-foreground/50 hover:text-foreground hover:bg-black/10 cursor-pointer"
                  title="Dismiss notification"
                >
                  <X size={13} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
