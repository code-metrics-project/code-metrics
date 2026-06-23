import { create } from "zustand";

export interface ToastItem {
  id: string;
  text: string;
  timeout: number;
  timeoutId?: ReturnType<typeof setTimeout>;
}

interface ToastState {
  toasts: ToastItem[];
}

interface ToastActions {
  push: (item: Partial<ToastItem> & Required<Pick<ToastItem, "text">>) => void;
  remove: (id: string) => void;
  clear: () => void;
}

let toastIdCounter = 0;

export const useToastStore = create<ToastState & ToastActions>()((set) => ({
  toasts: [],

  push: (item) => {
    if (item.timeout !== undefined && item.timeout <= 0) {
      console.warn(`Ignoring toast with zero or negative timeout [text='${item.text}']`);
      return;
    }

    const toast: ToastItem = {
      id: `toast-${++toastIdCounter}`,
      text: item.text,
      timeout: item.timeout ?? 2000,
    };

    // Auto-remove after timeout and store the timeout ID
    const timeoutId = setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== toast.id),
      }));
    }, toast.timeout);

    toast.timeoutId = timeoutId;

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));
  },

  remove: (id: string) => {
    set((state) => {
      // Clear timeout before removing to prevent memory leak
      const toast = state.toasts.find((t) => t.id === id);
      if (toast?.timeoutId) {
        clearTimeout(toast.timeoutId);
      }
      return {
        toasts: state.toasts.filter((t) => t.id !== id),
      };
    });
  },

  clear: () => {
    // Clear all timeouts before clearing toasts
    const state = useToastStore.getState();
    state.toasts.forEach((toast) => {
      if (toast.timeoutId) {
        clearTimeout(toast.timeoutId);
      }
    });
    set({ toasts: [] });
  },
}));
