import { FC, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ScrollableArea } from './ScrollableArea';

export type ViewShellClasses = {
  root?: string;
  scrollableArea?: string;
};

export type ViewShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  headerActions?: ReactNode;
  'data-testid'?: string;
  classes?: ViewShellClasses;
};

export const ViewShell: FC<ViewShellProps> = ({
  children,
  title,
  subtitle,
  headerActions,
  'data-testid': dataTestId,
  classes,
}) => (
  <div
    className={cn(
      'surface-background relative flex h-full min-h-0 w-full flex-1 flex-col items-start justify-start px-8 pt-6 pb-6 overflow-hidden font-sans',
      classes?.root,
    )}
    data-testid={dataTestId}
  >
    {(title || headerActions) && (
      <div className="mb-6 flex w-full flex-0 items-center justify-between">
        {title && (
          <h1
            className="text-left text-3xl font-extrabold tracking-tight text-foreground"
            data-testid="title"
          >
            {title}
          </h1>
        )}
        {headerActions && <div>{headerActions}</div>}
      </div>
    )}
    {subtitle && (
      <h2 className="mb-4 flex w-full flex-0 flex-row text-left text-xl font-semibold text-foreground/80">
        {subtitle}
      </h2>
    )}
    <ScrollableArea
      className={cn(
        'flex min-h-0 w-full flex-1 flex-col',
        classes?.scrollableArea,
      )}
    >
      {children}
    </ScrollableArea>
  </div>
);
