import { defineStore } from "pinia";

export type DialogItem = {
  confirmTitle: string;
  showCancel?: boolean;
  subtitle?: string;
  title: string;
  text: string;
  onDismiss: (result?: boolean) => void;
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
      this.dialogs.push({ ...item, showCancel: item.showCancel ?? true });
    },
  },
});
