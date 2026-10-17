import { FC, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AppShellProps {
  sidebar: ReactNode;
  mainContent: ReactNode;
  playerBar: ReactNode;
  topbar?: ReactNode;
  className?: string;
}

export const AppShell: FC<AppShellProps> = ({
  sidebar,
  mainContent,
  playerBar,
  topbar,
  className,
}) => {
  return (
    <div
      className={cn(
        'h-screen w-screen overflow-hidden flex flex-col',
        'bg-[var(--background)] text-[var(--text-primary)] font-sans',
        className,
      )}
    >
      {topbar && (
        <div className="shrink-0 z-40 border-b border-[var(--border)]">
          {topbar}
        </div>
      )}

      {/* Main Workspace: CSS Grid [sidebar] [main] */}
      <div className="grid grid-cols-[220px_1fr] flex-1 min-h-0 w-full overflow-hidden">
        {/* Fixed 220px Sidebar container */}
        <div className="w-[220px] h-full overflow-hidden">
          {sidebar}
        </div>

        {/* Fluid Scrollable Main Content container */}
        <div className="min-w-0 h-full flex flex-col overflow-hidden">
          {mainContent}
        </div>
      </div>

      {/* Fixed 72px Player Bar container */}
      <div className="h-[72px] min-h-[72px] max-h-[72px] w-full shrink-0 z-50">
        {playerBar}
      </div>
    </div>
  );
};
