import { defineStore } from "pinia";
import { logger } from "@/utils/logger.ts";

export type DialogItem = {
  deduplicationId?: string;
  confirmTitle: string;
  showCancel?: boolean;
  cancelTitle?: string;
  subtitle?: string;
  title: string;
  text: string;
  onDismiss: (result?: boolean) => Promise<void>;
};

type DialogState = {
  dialogs: DialogItem[];
};

export const useDialogStore = defineStore("dialog", {
  state: (): DialogState => ({
    dialogs: [],
  }),

  actions: {
    push(item: DialogItem) {
      if (item.deduplicationId) {
        if (this.dialogs.find((d) => d.deduplicationId === item.deduplicationId)) {
          logger(`Skipping enqueue of dialog [deduplicationId='${item.deduplicationId}',title='${item.title}']`);
          return;
        }
      }
      this.dialogs.push({
        ...item,
        showCancel: item.showCancel ?? true,
        cancelTitle: item.cancelTitle ?? "Cancel",
      });
    },
  },
});
