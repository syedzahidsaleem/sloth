import { FC, useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SelectOption = { id: string; label: string };

export interface SelectProps {
  label?: string;
  description?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const Select: FC<SelectProps> = ({
  label,
  description,
  options,
  value,
  onChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.id === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex w-full flex-col gap-1.5 select-none" ref={containerRef}>
      {label && <label className="text-foreground text-sm font-semibold">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'surface-primary border-border text-foreground shadow-shadow flex h-10 w-full items-center justify-between rounded-md border-(length:--border-width) px-4 text-sm font-bold outline-none cursor-pointer',
            className,
          )}
        >
          <span>{selectedOption?.label ?? value}</span>
          <ChevronDown size={16} className={cn('transition-transform text-foreground', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <div className="surface-muted border-border shadow-nav absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border-(length:--border-width) p-1">
            {options.map((option) => {
              const isSelected = option.id === value;
              return (
                <div
                  key={option.id}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 text-xs font-bold rounded cursor-pointer transition-colors',
                    isSelected
                      ? 'surface-primary border-border border-(length:--border-width)'
                      : 'hover:bg-foreground/10 text-foreground',
                  )}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check size={14} className="text-foreground shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {description && <p className="text-foreground/60 text-xs">{description}</p>}
    </div>
  );
};

export default Select;
