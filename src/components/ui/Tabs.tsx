/**
 * Sloth UI Component
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import {
  createContext,
  useContext,
  useState,
  FC,
  ReactNode,
  PropsWithChildren,
} from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

type TabsContextValue = {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('Tabs subcomponents must be used within TabsRoot');
  }
  return ctx;
}

export type TabsRootProps = PropsWithChildren<{
  defaultIndex?: number;
  selectedIndex?: number;
  onChange?: (index: number) => void;
  className?: string;
}>;

export const TabsRoot: FC<TabsRootProps> = ({
  defaultIndex = 0,
  selectedIndex: controlledIndex,
  onChange,
  className,
  children,
}) => {
  const [internalIndex, setInternalIndex] = useState(defaultIndex);
  const isControlled = controlledIndex !== undefined;
  const selectedIndex = isControlled ? controlledIndex : internalIndex;

  const setSelectedIndex = (index: number) => {
    if (!isControlled) {
      setInternalIndex(index);
    }
    onChange?.(index);
  };

  return (
    <TabsContext.Provider value={{ selectedIndex, setSelectedIndex }}>
      <div className={cn('flex w-full flex-col gap-4', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const TabsList: FC<PropsWithChildren<{ className?: string }>> = ({
  className,
  children,
}) => (
  <div
    role="tablist"
    className={cn(
      'surface-muted border-border flex items-center gap-1.5 rounded border-(length:--border-width) p-1',
      className,
    )}
  >
    {children}
  </div>
);

export type TabsTabProps = {
  index: number;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

export const TabsTab: FC<TabsTabProps> = ({
  index,
  disabled = false,
  className,
  children,
}) => {
  const { selectedIndex, setSelectedIndex } = useTabsContext();
  const isSelected = selectedIndex === index;

  return (
    <Button
      role="tab"
      aria-selected={isSelected}
      disabled={disabled}
      variant={isSelected ? 'default' : 'text'}
      size="sm"
      onClick={() => setSelectedIndex(index)}
      className={cn(
        'rounded font-semibold transition-all',
        isSelected && 'shadow-shadow',
        className,
      )}
    >
      {children}
    </Button>
  );
};

export const TabsPanels: FC<PropsWithChildren<{ className?: string }>> = ({
  className,
  children,
}) => <div className={cn('w-full', className)}>{children}</div>;

export type TabsPanelProps = {
  index: number;
  className?: string;
  children: ReactNode;
};

export const TabsPanel: FC<TabsPanelProps> = ({
  index,
  className,
  children,
}) => {
  const { selectedIndex } = useTabsContext();
  if (selectedIndex !== index) return null;

  return (
    <div role="tabpanel" tabIndex={0} className={cn('w-full outline-none', className)}>
      {children}
    </div>
  );
};

export type TabsItem = {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
};

export type TabsProps = {
  items: TabsItem[];
  defaultIndex?: number;
  selectedIndex?: number;
  onChange?: (index: number) => void;
  className?: string;
};

export const Tabs: FC<TabsProps> & {
  Root: typeof TabsRoot;
  List: typeof TabsList;
  Tab: typeof TabsTab;
  Panels: typeof TabsPanels;
  Panel: typeof TabsPanel;
} = ({ items, defaultIndex, selectedIndex, onChange, className }) => (
  <TabsRoot
    defaultIndex={defaultIndex}
    selectedIndex={selectedIndex}
    onChange={onChange}
    className={className}
  >
    <TabsList>
      {items.map((item, idx) => (
        <TabsTab key={item.id} index={idx} disabled={item.disabled}>
          {item.label}
        </TabsTab>
      ))}
    </TabsList>
    <TabsPanels>
      {items.map((item, idx) => (
        <TabsPanel key={item.id} index={idx}>
          {item.content}
        </TabsPanel>
      ))}
    </TabsPanels>
  </TabsRoot>
);

Tabs.Root = TabsRoot;
Tabs.List = TabsList;
Tabs.Tab = TabsTab;
Tabs.Panels = TabsPanels;
Tabs.Panel = TabsPanel;
