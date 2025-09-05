import { describe, expect, it, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useToastStore, type ToastItem } from "../toast";

describe("useToastStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("initial state", () => {
    it("should have empty toasts array initially", () => {
      const store = useToastStore();
      expect(store.toasts).toEqual([]);
    });
  });

  describe("push action", () => {
    it("should add a toast to the toasts array", () => {
      const store = useToastStore();

      const toastItem = {
        text: "Test toast message",
        timeout: 3000,
      };

      store.push(toastItem);

      expect(store.toasts).toHaveLength(1);
      expect(store.toasts[0]).toEqual(toastItem);
    });

    it("should add a toast with timeout property", () => {
      const store = useToastStore();

      const toastItem: ToastItem = {
        text: "Test toast with timeout",
        timeout: 5000,
      };

      store.push(toastItem);

      expect(store.toasts).toHaveLength(1);
      expect(store.toasts[0]).toEqual(toastItem);
      expect(store.toasts[0].timeout).toBe(5000);
    });

    it("should add a toast without timeout property and set default timeout", () => {
      const store = useToastStore();

      const toastItem = {
        text: "Test toast without timeout",
      };

      store.push(toastItem);

      expect(store.toasts).toHaveLength(1);
      expect(store.toasts[0].text).toBe("Test toast without timeout");
      expect(store.toasts[0].timeout).toBe(2000);
    });

    it("should add multiple toasts to the array in order", () => {
      const store = useToastStore();

      const toastItem1: ToastItem = {
        text: "First toast",
        timeout: 3000,
      };

      const toastItem2: ToastItem = {
        text: "Second toast",
        timeout: 5000,
      };

      const toastItem3 = {
        text: "Third toast",
      };

      store.push(toastItem1);
      store.push(toastItem2);
      store.push(toastItem3);

      expect(store.toasts).toHaveLength(3);
      expect(store.toasts[0]).toEqual(toastItem1);
      expect(store.toasts[1]).toEqual(toastItem2);
      expect(store.toasts[2]).toEqual(toastItem3);
    });

    it("should reject toast with zero timeout", () => {
      const store = useToastStore();
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const toastItem = {
        text: "Zero timeout toast",
        timeout: 0,
      };

      store.push(toastItem);

      expect(store.toasts).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Ignoring toast with zero or negative timeout [text='Zero timeout toast']",
      );
      consoleSpy.mockRestore();
    });

    it("should reject toast with negative timeout", () => {
      const store = useToastStore();
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const toastItem = {
        text: "Negative timeout toast",
        timeout: -1000,
      };

      store.push(toastItem);

      expect(store.toasts).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Ignoring toast with zero or negative timeout [text='Negative timeout toast']",
      );
      consoleSpy.mockRestore();
    });

    it("should maintain state across multiple store instances", () => {
      const store1 = useToastStore();
      const store2 = useToastStore();

      const toastItem: ToastItem = {
        text: "Shared state test",
        timeout: 4000,
      };

      store1.push(toastItem);

      expect(store2.toasts).toHaveLength(1);
      expect(store2.toasts[0]).toEqual(toastItem);
    });
  });
});
