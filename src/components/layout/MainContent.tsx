/**
 * Ensure any repository we take reference from or code from isn't referenced or spoken about anywhere either in files or readme or code
 * Original: packages/ui/src/components/ViewShell/ViewShell.tsx
 * Adapted for Sloth by syedzahidsaleem2@gmail.com
 * Changes: [styling system, data layer, routing, main scrollable content area]
 */

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
        'surface-background text-foreground flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden font-sans',
        className,
      )}
      tabIndex={-1}
      aria-label="Main Content Viewport"
    >
      {header && (
        <header className="surface-primary border-border sticky top-0 z-30 shrink-0 border-b-(length:--border-width) px-6 py-3">
          {header}
        </header>
      )}

      <div className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {children}
      </div>
    </main>
  );
};
