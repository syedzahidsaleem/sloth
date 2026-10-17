import { AnimatePresence, motion } from 'motion/react';
import { FC, PropsWithChildren, ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ModalProps = PropsWithChildren<{
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  showCloseButton?: boolean;
}>;

export const Modal: FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  actions,
  className,
  showCloseButton = true,
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="bg-overlay fixed inset-0 backdrop-blur-xs"
          />

          {/* Modal Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 24,
              mass: 0.8,
            }}
            className={cn(
              'border-border surface-background shadow-shadow relative z-10 w-full max-w-md rounded-lg border-(length:--border-width) p-6 backdrop-blur-xl',
              className,
            )}
          >
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="text-foreground/70 hover:text-foreground absolute top-4 right-4 rounded-md p-1 hover:bg-foreground/10 transition-colors"
              >
                <X size={18} />
              </button>
            )}

            {title && (
              <h2 className="text-foreground mb-1 text-xl font-bold tracking-tight">
                {title}
              </h2>
            )}

            {description && (
              <p className="text-foreground/70 mb-4 text-sm leading-relaxed">
                {description}
              </p>
            )}

            <div className="mt-2">{children}</div>

            {actions && (
              <div className="mt-6 flex items-center justify-end gap-2.5">
                {actions}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
