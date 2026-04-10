import { useEffect, useState } from "react";
import { useDialogStore, type DialogItem } from "@/store/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * DialogQueue component that renders dialogs from the dialog store.
 * Mimics the Vue app's Dialog.vue component behavior.
 */
export function DialogQueue() {
  const [currentDialog, setCurrentDialog] = useState<DialogItem | undefined>();
  const [isOpen, setIsOpen] = useState(false);

  // Subscribe to the dialogs array directly
  const dialogs = useDialogStore((state) => state.dialogs);

  console.log(
    "[DialogQueue] Render - isOpen:",
    isOpen,
    "currentDialog:",
    currentDialog?.title,
    "dialogs in store:",
    dialogs.length
  );

  // When dialogs change and we're not showing a dialog, show the next one
  useEffect(() => {
    console.log("[DialogQueue] Effect triggered - isOpen:", isOpen, "dialogs.length:", dialogs.length);
    if (!isOpen && dialogs.length > 0) {
      // Use setTimeout to avoid synchronous state update in effect
      const timer = setTimeout(() => {
        const nextDialog = useDialogStore.getState().pop();
        if (nextDialog) {
          console.log("[DialogQueue] Showing next dialog:", nextDialog.title);
          setCurrentDialog(nextDialog);
          setIsOpen(true);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [dialogs, isOpen]);

  const dismiss = async (result: boolean) => {
    const onDismiss = currentDialog?.onDismiss;

    if (onDismiss) {
      try {
        await onDismiss(result);
      } catch (e) {
        console.error("An error occurred when dismissing the dialog", e);
      }
    }

    setIsOpen(false);
    setCurrentDialog(undefined);
  };

  const handleCancel = () => dismiss(false);
  const handleConfirm = () => dismiss(true);

  if (!currentDialog) {
    return null;
  }

  // Prevent dialog from being closed by clicking outside or pressing Escape
  // Only allow dismissal through the action buttons
  const handleOpenChange = (open: boolean) => {
    // Don't allow closing the dialog through external means
    if (!open) {
      return;
    }
    setIsOpen(open);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{currentDialog.title}</AlertDialogTitle>
          {(currentDialog.subtitle || currentDialog.text) && (
            <AlertDialogDescription>
              {currentDialog.subtitle && <div className="font-medium">{currentDialog.subtitle}</div>}
              {currentDialog.text && <div className="mt-2">{currentDialog.text}</div>}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          {currentDialog.showCancel && (
            <AlertDialogCancel onClick={handleCancel}>{currentDialog.cancelTitle || "Cancel"}</AlertDialogCancel>
          )}
          <AlertDialogAction onClick={handleConfirm}>{currentDialog.confirmTitle}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
