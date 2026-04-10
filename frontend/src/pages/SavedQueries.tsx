import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/hooks/useI18n";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Paths } from "@/router/paths";
import { PlusCircle, Trash2, Loader2 } from "lucide-react";
import { listQueryCollections, deleteQueryCollection } from "@/queries/stored";
import type { StoredQueryCollectionMeta } from "@/model/query";
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
import { toast } from "sonner";

export default function SavedQueries() {
  const { t } = useI18n();
  const [queries, setQueries] = useState<StoredQueryCollectionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [queryToDelete, setQueryToDelete] = useState<StoredQueryCollectionMeta | null>(null);

  const loadQueries = useCallback(async () => {
    setLoading(true);
    try {
      const collections = await listQueryCollections();
      setQueries(collections);
    } catch (error) {
      console.error("Failed to load queries:", error);
      toast.error(t("pages:savedQueries.toast.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadQueries();
  }, [loadQueries]);

  const handleDeleteClick = (query: StoredQueryCollectionMeta) => {
    setQueryToDelete(query);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!queryToDelete) return;

    try {
      await deleteQueryCollection(queryToDelete.id);
      toast.success(t("pages:savedQueries.toast.deleteSuccess"));
      await loadQueries();
    } catch (error) {
      console.error("Failed to delete query:", error);
      toast.error(t("pages:savedQueries.toast.deleteError"));
    } finally {
      setDeleteDialogOpen(false);
      setQueryToDelete(null);
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("pages:savedQueries.title")}</h1>
        <Button asChild>
          <Link to={Paths.NewQuery}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("pages:savedQueries.newQuery")}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("pages:savedQueries.yourQueries")}</CardTitle>
          <CardDescription>{t("pages:savedQueries.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : queries.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">{t("pages:savedQueries.noSaved")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("pages:savedQueries.colHeaders.name")}</TableHead>
                  <TableHead className="text-right">{t("pages:savedQueries.colHeaders.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queries.map((query) => (
                  <TableRow key={query.id}>
                    <TableCell className="font-medium">
                      <Link to={`${Paths.SavedQueries}/${query.id}`} className="text-primary hover:underline">
                        {query.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(query)}>
                        <Trash2 className="text-destructive h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pages:savedQueries.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("pages:savedQueries.deleteConfirmMessage")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("pages:savedQueries.buttonCancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              {t("pages:savedQueries.buttonDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
