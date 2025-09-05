import { describe, expect, it, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useDialogStore, type DialogItem } from "../dialog";
import { logger } from "@/utils/logger";

// Mock the logger
vi.mock("@/utils/logger", () => ({
  logger: vi.fn(),
}));

describe("useDialogStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have empty dialogs array initially", () => {
      const store = useDialogStore();
      expect(store.dialogs).toEqual([]);
    });
  });

  describe("push action", () => {
    it("should add a dialog to the dialogs array", () => {
      const store = useDialogStore();
      const mockOnDismiss = vi.fn();

      const dialogItem: DialogItem = {
        confirmTitle: "Confirm",
        title: "Test Dialog",
        text: "Test message",
        onDismiss: mockOnDismiss,
      };

      store.push(dialogItem);

      expect(store.dialogs).toHaveLength(1);
      expect(store.dialogs[0]).toEqual({
        ...dialogItem,
        showCancel: true,
        cancelTitle: "Cancel",
      });
    });

    it("should add default values for showCancel and cancelTitle when not provided", () => {
      const store = useDialogStore();
      const mockOnDismiss = vi.fn();

      const dialogItem: DialogItem = {
        confirmTitle: "Confirm",
        title: "Test Dialog",
        text: "Test message",
        onDismiss: mockOnDismiss,
      };

      store.push(dialogItem);

      expect(store.dialogs[0].showCancel).toBe(true);
      expect(store.dialogs[0].cancelTitle).toBe("Cancel");
    });

    it("should preserve provided showCancel and cancelTitle values", () => {
      const store = useDialogStore();
      const mockOnDismiss = vi.fn();

      const dialogItem: DialogItem = {
        confirmTitle: "Confirm",
        showCancel: false,
        cancelTitle: "Custom Cancel",
        title: "Test Dialog",
        text: "Test message",
        onDismiss: mockOnDismiss,
      };

      store.push(dialogItem);

      expect(store.dialogs[0].showCancel).toBe(false);
      expect(store.dialogs[0].cancelTitle).toBe("Custom Cancel");
    });

    it("should add multiple dialogs to the array", () => {
      const store = useDialogStore();
      const mockOnDismiss1 = vi.fn();
      const mockOnDismiss2 = vi.fn();

      const dialogItem1: DialogItem = {
        confirmTitle: "Confirm 1",
        title: "Test Dialog 1",
        text: "Test message 1",
        onDismiss: mockOnDismiss1,
      };

      const dialogItem2: DialogItem = {
        confirmTitle: "Confirm 2",
        title: "Test Dialog 2",
        text: "Test message 2",
        onDismiss: mockOnDismiss2,
      };

      store.push(dialogItem1);
      store.push(dialogItem2);

      expect(store.dialogs).toHaveLength(2);
      expect(store.dialogs[0].title).toBe("Test Dialog 1");
      expect(store.dialogs[1].title).toBe("Test Dialog 2");
    });

    it("should include optional properties when provided", () => {
      const store = useDialogStore();
      const mockOnDismiss = vi.fn();

      const dialogItem: DialogItem = {
        deduplicationId: "test-id",
        confirmTitle: "Confirm",
        subtitle: "Test Subtitle",
        title: "Test Dialog",
        text: "Test message",
        onDismiss: mockOnDismiss,
      };

      store.push(dialogItem);

      expect(store.dialogs[0].deduplicationId).toBe("test-id");
      expect(store.dialogs[0].subtitle).toBe("Test Subtitle");
    });
  });

  describe("deduplication functionality", () => {
    it("should add dialog when no deduplicationId is provided", () => {
      const store = useDialogStore();
      const mockOnDismiss = vi.fn();

      const dialogItem: DialogItem = {
        confirmTitle: "Confirm",
        title: "Test Dialog",
        text: "Test message",
        onDismiss: mockOnDismiss,
      };

      store.push(dialogItem);

      expect(store.dialogs).toHaveLength(1);
      expect(logger).not.toHaveBeenCalled();
    });

    it("should add dialog when deduplicationId is unique", () => {
      const store = useDialogStore();
      const mockOnDismiss = vi.fn();

      const dialogItem: DialogItem = {
        deduplicationId: "unique-id",
        confirmTitle: "Confirm",
        title: "Test Dialog",
        text: "Test message",
        onDismiss: mockOnDismiss,
      };

      store.push(dialogItem);

      expect(store.dialogs).toHaveLength(1);
      expect(logger).not.toHaveBeenCalled();
    });

    it("should skip adding dialog when deduplicationId already exists", () => {
      const store = useDialogStore();
      const mockOnDismiss1 = vi.fn();
      const mockOnDismiss2 = vi.fn();

      const dialogItem1: DialogItem = {
        deduplicationId: "duplicate-id",
        confirmTitle: "Confirm 1",
        title: "Test Dialog 1",
        text: "Test message 1",
        onDismiss: mockOnDismiss1,
      };

      const dialogItem2: DialogItem = {
        deduplicationId: "duplicate-id",
        confirmTitle: "Confirm 2",
        title: "Test Dialog 2",
        text: "Test message 2",
        onDismiss: mockOnDismiss2,
      };

      store.push(dialogItem1);
      store.push(dialogItem2);

      expect(store.dialogs).toHaveLength(1);
      expect(store.dialogs[0].title).toBe("Test Dialog 1");
    });

    it("should log when skipping duplicate dialog", () => {
      const store = useDialogStore();
      const mockOnDismiss1 = vi.fn();
      const mockOnDismiss2 = vi.fn();

      const dialogItem1: DialogItem = {
        deduplicationId: "duplicate-id",
        confirmTitle: "Confirm 1",
        title: "Test Dialog 1",
        text: "Test message 1",
        onDismiss: mockOnDismiss1,
      };

      const dialogItem2: DialogItem = {
        deduplicationId: "duplicate-id",
        confirmTitle: "Confirm 2",
        title: "Test Dialog 2",
        text: "Test message 2",
        onDismiss: mockOnDismiss2,
      };

      store.push(dialogItem1);
      store.push(dialogItem2);

      expect(logger).toHaveBeenCalledWith(
        "Skipping enqueue of dialog [deduplicationId='duplicate-id',title='Test Dialog 2']",
      );
    });

    it("should allow adding different deduplicationIds", () => {
      const store = useDialogStore();
      const mockOnDismiss1 = vi.fn();
      const mockOnDismiss2 = vi.fn();

      const dialogItem1: DialogItem = {
        deduplicationId: "id-1",
        confirmTitle: "Confirm 1",
        title: "Test Dialog 1",
        text: "Test message 1",
        onDismiss: mockOnDismiss1,
      };

      const dialogItem2: DialogItem = {
        deduplicationId: "id-2",
        confirmTitle: "Confirm 2",
        title: "Test Dialog 2",
        text: "Test message 2",
        onDismiss: mockOnDismiss2,
      };

      store.push(dialogItem1);
      store.push(dialogItem2);

      expect(store.dialogs).toHaveLength(2);
      expect(store.dialogs[0].deduplicationId).toBe("id-1");
      expect(store.dialogs[1].deduplicationId).toBe("id-2");
    });

    it("should handle mixed dialogs with and without deduplicationId", () => {
      const store = useDialogStore();
      const mockOnDismiss1 = vi.fn();
      const mockOnDismiss2 = vi.fn();
      const mockOnDismiss3 = vi.fn();

      const dialogItem1: DialogItem = {
        deduplicationId: "unique-id",
        confirmTitle: "Confirm 1",
        title: "Test Dialog 1",
        text: "Test message 1",
        onDismiss: mockOnDismiss1,
      };

      const dialogItem2: DialogItem = {
        confirmTitle: "Confirm 2",
        title: "Test Dialog 2",
        text: "Test message 2",
        onDismiss: mockOnDismiss2,
      };

      const dialogItem3: DialogItem = {
        confirmTitle: "Confirm 3",
        title: "Test Dialog 3",
        text: "Test message 3",
        onDismiss: mockOnDismiss3,
      };

      store.push(dialogItem1);
      store.push(dialogItem2);
      store.push(dialogItem3);

      expect(store.dialogs).toHaveLength(3);
    });
  });

  describe("edge cases", () => {
    it("should handle empty string deduplicationId", () => {
      const store = useDialogStore();
      const mockOnDismiss = vi.fn();

      const dialogItem: DialogItem = {
        deduplicationId: "",
        confirmTitle: "Confirm",
        title: "Test Dialog",
        text: "Test message",
        onDismiss: mockOnDismiss,
      };

      store.push(dialogItem);

      expect(store.dialogs).toHaveLength(1);
    });

    it("should handle undefined values in optional fields", () => {
      const store = useDialogStore();
      const mockOnDismiss = vi.fn();

      const dialogItem: DialogItem = {
        deduplicationId: undefined,
        confirmTitle: "Confirm",
        showCancel: undefined,
        cancelTitle: undefined,
        subtitle: undefined,
        title: "Test Dialog",
        text: "Test message",
        onDismiss: mockOnDismiss,
      };

      store.push(dialogItem);

      expect(store.dialogs).toHaveLength(1);
      expect(store.dialogs[0].showCancel).toBe(true);
      expect(store.dialogs[0].cancelTitle).toBe("Cancel");
    });
  });
});
