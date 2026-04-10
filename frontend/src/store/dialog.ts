import { create } from "zustand";
import { logger } from "@/utils/logger";

export interface DialogItem {
  deduplicationId?: string;
  confirmTitle: string;
  showCancel?: boolean;
  cancelTitle?: string;
  subtitle?: string;
  title: string;
  text: string;
  onDismiss: (result?: boolean) => Promise<void>;
}

interface DialogState {
  dialogs: DialogItem[];
}

interface DialogActions {
  push: (item: DialogItem) => void;
  pop: () => DialogItem | undefined;
  clear: () => void;
}

export const useDialogStore = create<DialogState & DialogActions>()((set, get) => ({
  dialogs: [],

  push: (item: DialogItem) => {
    if (item.deduplicationId) {
      const existing = get().dialogs.find((d) => d.deduplicationId === item.deduplicationId);
      if (existing) {
        logger(`Skipping enqueue of dialog [deduplicationId='${item.deduplicationId}',title='${item.title}']`);
        return;
      }
    }
    set((state) => ({
      dialogs: [
        ...state.dialogs,
        {
          ...item,
          showCancel: item.showCancel ?? true,
          cancelTitle: item.cancelTitle ?? "Cancel",
        },
      ],
    }));
  },

  pop: () => {
    const dialogs = get().dialogs;
    if (dialogs.length === 0) return undefined;
    const [first, ...rest] = dialogs;
    set({ dialogs: rest });
    return first;
  },

  clear: () => {
    set({ dialogs: [] });
  },
}));
