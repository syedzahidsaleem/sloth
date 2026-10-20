/**
 * Sloth UI Component
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  createContext,
  FC,
  PropsWithChildren,
  ReactNode,
  useContext,
  useEffect,
} from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type DialogContextValue = {
  onClose: () => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export const useDialogContext = () => {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('Dialog components must be used within <Dialog>');
  }
  return ctx;
};

export const DialogOverlayBackdrop: FC<{ className?: string }> = ({ className }) => {
  const { onClose } = useDialogContext();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      className={cn('fixed inset-0 z-40 bg-black/60', className)}
    />
  );
};

export const DialogXClose: FC<{ className?: string }> = ({ className }) => {
  const { onClose } = useDialogContext();
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close dialog"
      className={cn(
        'text-foreground/70 hover:text-foreground absolute top-4 right-4 rounded p-1 hover:bg-foreground/10 transition-colors cursor-pointer select-none',
        className,
      )}
    >
      <X size={18} />
    </button>
  );
};

export const DialogTitle: FC<PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => (
  <h2
    className={cn(
      'text-foreground mb-1 text-xl font-bold tracking-tight',
      className,
    )}
  >
    {children}
  </h2>
);

export const DialogDescription: FC<PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => (
  <p className={cn('text-foreground/70 mb-4 text-sm leading-relaxed', className)}>
    {children}
  </p>
);

export const DialogActions: FC<PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => (
  <div className={cn('mt-6 flex items-center justify-end gap-2.5', className)}>
    {children}
  </div>
);

export const DialogClose: FC<
  PropsWithChildren<{ className?: string; onClick?: () => void; asChild?: boolean }>
> = ({ children, className, onClick }) => {
  const { onClose } = useDialogContext();
  return (
    <div
      onClick={() => {
        onClick?.();
        onClose();
      }}
      className={className}
    >
      {children}
    </div>
  );
};

export type ModalProps = PropsWithChildren<{
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  showCloseButton?: boolean;
}>;

export const DialogRoot: FC<
  PropsWithChildren<{
    isOpen?: boolean;
    open?: boolean;
    onClose: () => void;
    className?: string;
    showCloseButton?: boolean;
  }>
> = ({ isOpen, open, onClose, className, showCloseButton = true, children }) => {
  const shouldReduce = useReducedMotion();
  const activeOpen = Boolean(open ?? isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeOpen, onClose]);

  return (
    <DialogContext.Provider value={{ onClose }}>
      <AnimatePresence>
        {activeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <DialogOverlayBackdrop />
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
              animate={shouldReduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 24,
                mass: 0.8,
              }}
              className={cn(
                'border-border surface-background shadow-shadow relative z-50 w-full max-w-md rounded-[4px] border-(length:--border-width) p-6 select-none',
                className,
              )}
            >
              {showCloseButton && <DialogXClose />}
              {children}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
};

export type ModalComponent = FC<ModalProps> & {
  Root: typeof DialogRoot;
  Title: typeof DialogTitle;
  Description: typeof DialogDescription;
  Actions: typeof DialogActions;
  Close: typeof DialogClose;
  XClose: typeof DialogXClose;
  Backdrop: typeof DialogOverlayBackdrop;
};

const ModalImpl: FC<ModalProps> = ({
  isOpen,
  open,
  onClose,
  title,
  description,
  actions,
  className,
  showCloseButton = true,
  children,
}) => {
  const activeOpen = Boolean(open ?? isOpen);
  return (
    <DialogRoot
      isOpen={activeOpen}
      onClose={onClose}
      className={className}
      showCloseButton={showCloseButton}
    >
      {title && <DialogTitle>{title}</DialogTitle>}
      {description && <DialogDescription>{description}</DialogDescription>}
      <div className="mt-2">{children}</div>
      {actions && <DialogActions>{actions}</DialogActions>}
    </DialogRoot>
  );
};

export const Modal = ModalImpl as ModalComponent;
Modal.Root = DialogRoot;
Modal.Title = DialogTitle;
Modal.Description = DialogDescription;
Modal.Actions = DialogActions;
Modal.Close = DialogClose;
Modal.XClose = DialogXClose;
Modal.Backdrop = DialogOverlayBackdrop;

export const Dialog = Modal;
export const ModalTitle = DialogTitle;
export const ModalDescription = DialogDescription;
export const ModalActions = DialogActions;
export const ModalClose = DialogClose;
