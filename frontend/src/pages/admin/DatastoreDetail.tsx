import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Paths } from "@/router/paths";
import { Database, Loader2, AlertCircle, Hash, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { checkCollectionExists, countCollectionItems, emptyCollection } from "@/services/datastores";
import { useI18n } from "@/hooks/useI18n";
import { PageBreadcrumbs } from "@/components/layout";

export default function DatastoreDetail() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name") ?? "";

  const breadcrumbs = [
    { label: t("pages:admin.title"), to: Paths.AdminHome },
    { label: t("pages:admin.datastores.title"), to: Paths.AdminDatastores },
    { label: name },
  ];

  const [exists, setExists] = useState<boolean | null>(null);
  const [checkingExists, setCheckingExists] = useState(true);
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [emptying, setEmptying] = useState(false);
  const [showEmptyDialog, setShowEmptyDialog] = useState(false);

  const loadExists = useCallback(async () => {
    if (!name) return;
    setCheckingExists(true);
    try {
      const result = await checkCollectionExists(name);
      setExists(result);
    } catch (error) {
      console.error("Failed to check existence:", error);
      toast.error(t("pages:admin.datastores.detail.toast.existsError"));
    } finally {
      setCheckingExists(false);
    }
  }, [name, t]);

  useEffect(() => {
    loadExists();
  }, [loadExists]);

  const handleCount = async () => {
    setCounting(true);
    try {
      const result = await countCollectionItems(name);
      setCount(result);
    } catch (error) {
      console.error("Failed to count items:", error);
      toast.error(t("pages:admin.datastores.detail.toast.countError"));
    } finally {
      setCounting(false);
    }
  };

  const handleEmpty = async () => {
    setEmptying(true);
    try {
      await emptyCollection(name);
      setShowEmptyDialog(false);
      setCount(null);
      await loadExists();
      toast.success(t("pages:admin.datastores.detail.toast.emptySuccess"));
    } catch (error) {
      console.error("Failed to empty collection:", error);
      toast.error(t("pages:admin.datastores.detail.toast.emptyError"));
    } finally {
      setEmptying(false);
    }
  };

  return (
    <div>
      <div className="header-section">
        <div className="relative z-10 container mx-auto px-4 py-8">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="mt-4 pb-4 text-3xl font-bold">{t("pages:admin.datastores.detail.title")}</h2>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Collection Name */}
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                {t("pages:admin.datastores.detail.nameLabel")}
              </p>
              <p className="font-mono text-lg">{name}</p>
            </div>

            {/* Exists */}
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                {t("pages:admin.datastores.detail.existsLabel")}
              </p>
              {checkingExists ? (
                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
              ) : (
                <p className="text-lg">
                  {exists ? t("pages:admin.datastores.detail.existsYes") : t("pages:admin.datastores.detail.existsNo")}
                </p>
              )}
            </div>

            {/* Item Count */}
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                {t("pages:admin.datastores.detail.countLabel")}
              </p>
              <div className="flex items-center gap-4">
                <p className="text-lg">
                  {count !== null ? count.toLocaleString() : t("pages:admin.datastores.detail.countNotChecked")}
                </p>
                <Button variant="outline" size="sm" onClick={handleCount} disabled={counting}>
                  {counting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hash className="mr-2 h-4 w-4" />}
                  {t("pages:admin.datastores.detail.countButton")}
                </Button>
              </div>
            </div>

            {/* Empty Collection */}
            <div>
              <Button variant="destructive" onClick={() => setShowEmptyDialog(true)} disabled={emptying}>
                {emptying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {t("pages:admin.datastores.detail.emptyButton")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty Confirmation Dialog */}
      <AlertDialog open={showEmptyDialog} onOpenChange={setShowEmptyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pages:admin.datastores.detail.emptyDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("pages:admin.datastores.detail.emptyDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t("pages:admin.datastores.detail.emptyDialog.warning")}</AlertDescription>
          </Alert>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("pages:admin.datastores.detail.emptyDialog.cancelButton")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmpty}
              disabled={emptying}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {emptying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("pages:admin.datastores.detail.emptyDialog.submitButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
