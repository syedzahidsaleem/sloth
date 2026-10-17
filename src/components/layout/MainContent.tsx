import { FC, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface MainContentProps {
  children: ReactNode;
  header?: ReactNode;
  className?: string;
}

export const MainContent: FC<MainContentProps> = ({
  children,
  header,
  className,
}) => {
  return (
    <main
      className={cn(
        'flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden',
        'bg-[var(--background)] text-[var(--text-primary)] font-sans',
        className,
      )}
      tabIndex={-1}
      aria-label="Main Content Viewport"
    >
      {header && (
        <header className="sticky top-0 z-30 shrink-0 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-none px-6 py-3">
          {header}
        </header>
      )}

      <div className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {children}
      </div>
    </main>
  );
};
