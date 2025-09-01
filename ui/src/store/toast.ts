import { defineStore } from "pinia";

export type ToastItem = {
  text: string;
  timeout: number;
};

type ToastState = {
  toasts: ToastItem[];
};

export const useToastStore = defineStore("toast", {
  state: (): ToastState => ({
    toasts: [],
  }),

  actions: {
    push(item: Partial<ToastItem> & Required<Omit<ToastItem, "timeout">>) {
      if (item.timeout === undefined) {
        item.timeout = 2000;
      } else if (item.timeout <= 0) {
        console.warn(`Ignoring toast with zero or negative timeout [text='${item.text}']`);
        return;
      }
      this.toasts.push(item as ToastItem);
    },
  },
});
