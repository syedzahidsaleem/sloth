import { FC, useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ThemeControllerProps = {
  className?: string;
};

export const ThemeController: FC<ThemeControllerProps> = ({ className }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    const handleSettingsChange = () => {
      const isDarkActive = document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDark(isDarkActive);
    };
    window.addEventListener('sloth-settings-change', handleSettingsChange);
    return () => window.removeEventListener('sloth-settings-change', handleSettingsChange);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-black transition-colors shadow-[2px_2px_0px_#000] focus:outline-none',
        isDark ? 'bg-[#3a1c24]' : 'bg-white',
        className,
      )}
    >
      <span
        className={cn(
          'pointer-events-none flex size-5.5 items-center justify-center rounded-full border-2 border-black bg-[var(--primary)] transition-transform shadow-[1px_1px_0px_#000]',
          isDark ? 'translate-x-5 text-white' : 'translate-x-0.5 text-black',
        )}
      >
        {isDark ? <Moon size={11} strokeWidth={2.5} /> : <Sun size={12} strokeWidth={2.5} />}
      </span>
    </button>
  );
};
