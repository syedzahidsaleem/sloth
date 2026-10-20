/**
 * Sloth Toast Notification System (Zustand)
 * Stacked bottom-right toast notifications for Info, Success, Error, and Undo actions.
 */

import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'error' | 'undo';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
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
      durationMs: toast.durationMs ?? (toast.type === 'undo' ? 5000 : 3000),
    };

    set((state) => ({
      toasts: [...state.toasts.slice(-4), newItem], // Keep max 5 stacked
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
