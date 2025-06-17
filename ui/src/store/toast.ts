import { defineStore } from "pinia";

export type ToastItem = {
  text: string;
  timeout?: number;
};

type ToastState = {
  toasts: ToastItem[];
};

export const useToastStore = defineStore("toast", {
  state: (): ToastState => ({
    toasts: [],
  }),

  actions: {
    push(item: ToastItem) {
      this.toasts.push(item);
    },
  },
});
