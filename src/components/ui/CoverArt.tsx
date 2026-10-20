/**
 * Sloth UI Component
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { motion, useReducedMotion } from 'motion/react';
import { FC, ReactNode, useEffect, useState } from 'react';
import { Disc3, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CoverArtProps = {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  imgClassName?: string;
  placeholder?: ReactNode;
  fallbackIcon?: 'disc' | 'music';
  loading?: 'eager' | 'lazy';
  decoding?: 'sync' | 'async' | 'auto';
  onLoad?: () => void;
  onError?: () => void;
};

const sizeClasses = {
  sm: 'size-10',
  md: 'size-14',
  lg: 'size-24',
  xl: 'size-44',
  full: 'size-full',
};

export const CoverArt: FC<CoverArtProps> = ({
  src,
  alt = 'Cover art',
  size = 'md',
  className,
  imgClassName,
  placeholder,
  fallbackIcon = 'disc',
  loading = 'lazy',
  decoding = 'async',
  onLoad,
  onError,
}) => {
  const prefersReduced = useReducedMotion();
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  const showImage = Boolean(src) && !errored;

  const defaultPlaceholder = (
    <div className="text-muted-foreground/30 flex size-full items-center justify-center">
      {fallbackIcon === 'disc' ? (
        <Disc3 className="size-1/2 stroke-1" />
      ) : (
        <Music className="size-1/2 stroke-1" />
      )}
    </div>
  );

  const activePlaceholder = placeholder ?? defaultPlaceholder;

  return (
    <div
      className={cn(
        'border-border bg-muted/60 relative aspect-square overflow-hidden rounded-[4px] border-(length:--border-width)',
        sizeClasses[size],
        className,
      )}
    >
      {showImage &&
        (prefersReduced ? (
          <img
            src={src}
            alt={alt}
            className={cn('size-full object-cover', imgClassName)}
            onLoad={() => {
              setLoaded(true);
              onLoad?.();
            }}
            onError={() => {
              setErrored(true);
              onError?.();
            }}
            loading={loading}
            decoding={decoding}
          />
        ) : (
          <motion.img
            key={src}
            src={src}
            alt={alt}
            className={cn('size-full object-cover', imgClassName)}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{
              opacity: loaded ? 1 : 0,
              scale: loaded ? 1 : 0.98,
            }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onLoad={() => {
              setLoaded(true);
              onLoad?.();
            }}
            onError={() => {
              setErrored(true);
              onError?.();
            }}
            loading={loading}
            decoding={decoding}
          />
        ))}

      {(!showImage || (!loaded && !errored)) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {activePlaceholder}
        </div>
      )}
    </div>
  );
};
