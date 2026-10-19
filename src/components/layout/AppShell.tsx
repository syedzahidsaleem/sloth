import { FC, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AppShellProps {
  topbar?: ReactNode;
  children: ReactNode;
  playerBar?: ReactNode;
  sidebar?: ReactNode;
  mainContent?: ReactNode;
  className?: string;
}

export const AppShell: FC<AppShellProps> = ({
  topbar,
  children,
  playerBar,
  sidebar,
  mainContent,
  className,
}) => {
  return (
    <div
      data-testid="app-shell"
      className={cn(
        'surface-background text-foreground grid h-screen w-screen grid-rows-[auto_1fr_auto] overflow-hidden select-none font-sans',
        className,
      )}
    >
      {topbar}
      {children ? children : (
        <div className="relative flex flex-1 min-h-0 overflow-hidden">
          {sidebar}
          {mainContent}
        </div>
      )}
      {playerBar}
    </div>
  );
};
