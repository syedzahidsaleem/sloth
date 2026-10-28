/**
 * Sloth Toast Notification System (Zustand)
 * Stacked bottom-right toast notifications for Info, Success, Error, and Undo actions.
 */

import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'error' | 'undo';

/** Maximum number of stacked toast notifications rendered simultaneously */
export const MAX_STACKED_TOASTS = 5;

/** Default auto-dismiss timeout intervals in milliseconds */
export const TOAST_DURATIONS = {
  DEFAULT: 3000,
  UNDO: 5000,
  ERROR: 4000,
} as const;

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export type ShowToastOptions = {
  title: string;
  message?: string;
  variant?: string;
  type?: ToastType;
  durationMs?: number;
};

export interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  showToast: (
    optionsOrTitle: ShowToastOptions | string,
    message?: string,
    type?: ToastType
  ) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newItem: ToastItem = {
      ...toast,
      id,
      durationMs:
        toast.durationMs ??
        (toast.type === 'undo' ? TOAST_DURATIONS.UNDO : TOAST_DURATIONS.DEFAULT),
    };

    set((state) => ({
      toasts: [...state.toasts.slice(-(MAX_STACKED_TOASTS - 1)), newItem],
    }));

    if (newItem.durationMs && newItem.durationMs > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, newItem.durationMs);
    }

    return id;
  },

  showToast: (optionsOrTitle, message, type = 'info') => {
    let tTitle: string;
    let tMessage: string | undefined = message;
    let tType: ToastType = type;
    let tDuration: number | undefined;

    if (typeof optionsOrTitle === 'object') {
      tTitle = optionsOrTitle.title;
      tMessage = optionsOrTitle.message;
      const v = optionsOrTitle.variant || optionsOrTitle.type;
      tType = (v === 'danger' || v === 'error') ? 'error' : (v === 'success' ? 'success' : 'info');
      tDuration = optionsOrTitle.durationMs;
    } else {
      tTitle = optionsOrTitle;
    }

    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newItem: ToastItem = {
      id,
      type: tType,
      title: tTitle,
      message: tMessage,
      durationMs:
        tDuration ?? (tType === 'undo' ? TOAST_DURATIONS.UNDO : TOAST_DURATIONS.DEFAULT),
    };

    set((state) => ({
      toasts: [...state.toasts.slice(-(MAX_STACKED_TOASTS - 1)), newItem],
    }));

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, newItem.durationMs);

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));

/**
 * Convenient standalone helper to trigger toasts from anywhere
 */
export const toast = {
  info: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'info', title, message }),
  success: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'success', title, message }),
  error: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'error', title, message }),
  undo: (title: string, onAction: () => void, actionLabel = 'Undo') =>
    useToastStore.getState().addToast({
      type: 'undo',
      title,
      onAction,
      actionLabel,
      durationMs: 5000,
    }),
};
