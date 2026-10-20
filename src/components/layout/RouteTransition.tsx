import { FC, ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

export type RouteTransitionProps = {
  children: ReactNode;
  pathname: string;
  className?: string;
};

const slideVariants = {
  enter: {
    x: 24,
    scale: 0.96,
    opacity: 0,
    filter: 'blur(4px)',
  },
  center: {
    x: 0,
    scale: 1,
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: {
    x: -24,
    scale: 0.96,
    opacity: 0,
    filter: 'blur(4px)',
  },
};

export const RouteTransition: FC<RouteTransitionProps> = ({
  children,
  pathname,
  className = '',
}) => {
  const shouldReduce = useReducedMotion();

  return (
    <div className={cn('relative h-full w-full overflow-hidden surface-background', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={pathname}
          variants={shouldReduce ? undefined : slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30,
            mass: 0.8,
          }}
          className="will-change-[transform,filter] surface-background absolute inset-0 h-full w-full overflow-hidden flex flex-col"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
