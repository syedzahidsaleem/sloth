import {
  FC,
  useId,
  useMemo,
  useState,
  KeyboardEvent,
  WheelEvent,
  useEffect,
} from 'react';
import { cn } from '@/lib/utils';

export type SliderProps = {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onValueChange?: (value: number) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  showValue?: boolean;
  startLabel?: string;
  endLabel?: string;
};

export const Slider: FC<SliderProps> = ({
  value: controlledValue,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  unit,
  onValueChange,
  disabled = false,
  className,
  label,
  showValue = true,
  startLabel,
  endLabel,
}) => {
  const [internalValue, setInternalValue] = useState<number>(defaultValue ?? min);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  useEffect(() => {
    if (isControlled) {
      setInternalValue(controlledValue);
    }
  }, [isControlled, controlledValue]);

  const clamp = (val: number) => Math.min(Math.max(val, min), max);

  const emit = (next: number) => {
    if (disabled) return;
    const clamped = clamp(next);
    if (!isControlled) {
      setInternalValue(clamped);
    }
    onValueChange?.(clamped);
  };

  const percentage = useMemo(() => {
    if (max === min) return 0;
    return ((value - min) / (max - min)) * 100;
  }, [value, min, max]);

  const inputId = useId();
  const labelId = `${inputId}-label`;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    const deltas: Record<string, number> = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      PageUp: step * 10,
      PageDown: -step * 10,
    };
    const delta = deltas[e.key];
    if (typeof delta === 'number') {
      e.preventDefault();
      emit(value + delta);
    } else if (e.key === 'Home') {
      e.preventDefault();
      emit(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      emit(max);
    }
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1;
    emit(value + direction * step);
  };

  return (
    <div
      className={cn('flex w-full flex-col gap-1.5 select-none', className)}
      onWheel={handleWheel}
    >
      {(label || showValue) && (
        <div className="flex w-full items-center justify-between text-xs font-semibold">
          {label && (
            <label id={labelId} htmlFor={inputId} className="text-foreground">
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-foreground/70 tabular-nums">
              {value}
              {unit ? ` ${unit}` : ''}
            </span>
          )}
        </div>
      )}

      <div className="relative flex h-6 w-full items-center">
        {/* Track background */}
        <div className="border-border surface-input relative h-2.5 w-full overflow-hidden rounded-md border-(length:--border-width)">
          {/* Active fill */}
          <div
            className="surface-primary absolute top-0 left-0 h-full rounded-l transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Thumb */}
        <div
          className={cn(
            'border-border bg-input pointer-events-none absolute top-1/2 -ml-2.5 h-5 w-5 -translate-y-1/2 rounded-full border-(length:--border-width) shadow-sm transition-transform',
            disabled && 'opacity-50',
          )}
          style={{ left: `${percentage}%` }}
        />

        {/* Hidden accessible input */}
        <input
          id={inputId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => emit(Number(e.target.value))}
          onKeyDown={handleKeyDown}
          aria-labelledby={label ? labelId : undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={unit ? `${value} ${unit}` : String(value)}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
      </div>

      {(startLabel || endLabel) && (
        <div className="text-foreground/60 flex w-full justify-between text-[10px]">
          <span>{startLabel}</span>
          <span>{endLabel}</span>
        </div>
      )}
    </div>
  );
};
