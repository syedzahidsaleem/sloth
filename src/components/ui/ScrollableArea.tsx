import {
  FC,
  MutableRefObject,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import { cn } from '@/lib/utils';

export type ScrollableAreaProps = {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  viewportRef?: MutableRefObject<HTMLDivElement | null>;
  'data-testid'?: string;
};

export const ScrollableArea: FC<ScrollableAreaProps> = ({
  children,
  className,
  viewportClassName,
  viewportRef,
  'data-testid': testId,
}) => {
  const localRef = useRef<HTMLDivElement | null>(null);

  const setViewportNode = useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (viewportRef) {
        viewportRef.current = node;
      }
    },
    [viewportRef],
  );

  return (
    <div
      className={cn('relative h-full w-full min-h-0 overflow-hidden', className)}
      data-testid={testId}
    >
      <div
        ref={setViewportNode}
        className={cn(
          'flex h-full w-full flex-col overflow-y-auto overflow-x-hidden',
          viewportClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
};
