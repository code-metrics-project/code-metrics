import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { saveQueryCollection } from "@/queries/stored";
import { generateIdFromTitle } from "@/queries/summary";
import type { StoredQueryCollection } from "@/model/query";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";

interface SaveQueryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: Partial<StoredQueryCollection>;
  onSaved?: (savedCollection: StoredQueryCollection) => void;
}

export function SaveQueryDialog({ open, onOpenChange, collection, onSaved }: SaveQueryDialogProps) {
  const { t } = useI18n();
  const [collectionTitle, setCollectionTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Reset title when dialog opens
  useEffect(() => {
    if (open) {
      setCollectionTitle(collection.title ?? "");
    }
  }, [open, collection.title]);

  const handleSave = async () => {
    if (!collectionTitle.trim()) {
      toast.error(t("components:query.pleaseEnterName"));
      return;
    }

    setIsSaving(true);
    try {
      const collectionId = generateIdFromTitle(collectionTitle);

      const fullCollection: StoredQueryCollection = {
        id: collectionId,
        title: collectionTitle,
        queries: collection.queries ?? [],
      };

      const saved = await saveQueryCollection(fullCollection);
      toast.success(t("components:query.querySaved"));
      onOpenChange(false);
      onSaved?.(saved);
    } catch (error) {
      console.error("Failed to save collection:", error);
      toast.error(t("components:query.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("components:query.saveQuery")}</DialogTitle>
          <DialogDescription>{t("components:query.saveQueryDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="collectionName">{t("components:query.collectionName")}</Label>
            <Input
              id="collectionName"
              name="queryName"
              value={collectionTitle}
              onChange={(e) => setCollectionTitle(e.target.value)}
              placeholder={t("components:query.collectionPlaceholder")}
              disabled={isSaving}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {t("buttons:cancel")}
          </Button>
          <Button name="setQueryName" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("buttons:save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
