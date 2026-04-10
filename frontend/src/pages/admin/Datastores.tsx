import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Paths } from "@/router/paths";
import { Database, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listCollections } from "@/services/datastores";
import { useI18n } from "@/hooks/useI18n";
import { PageBreadcrumbs } from "@/components/layout";

export default function Datastores() {
  const { t } = useI18n();
  const breadcrumbs = [
    { label: t("pages:admin.title"), to: Paths.AdminHome },
    { label: t("pages:admin.datastores.title") },
  ];
  const [collections, setCollections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listCollections();
      setCollections(data);
    } catch (error) {
      console.error("Failed to load collections:", error);
      toast.error(t("pages:admin.datastores.toast.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  return (
    <div>
      <div className="header-section">
        <div className="relative z-10 container mx-auto px-4 py-8">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="mt-4 pb-4 text-3xl font-bold">{t("pages:admin.datastores.title")}</h2>
          <p className="text-muted-foreground text-base">{t("pages:admin.datastores.description")}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {t("pages:admin.datastores.table.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              </div>
            ) : collections.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("pages:admin.datastores.table.name")}</TableHead>
                    <TableHead className="text-right">{t("pages:admin.datastores.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collections.map((name) => (
                    <TableRow key={name}>
                      <TableCell className="font-mono">{name}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`${Paths.AdminDatastoreDetail}?name=${encodeURIComponent(name)}`}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {t("pages:admin.datastores.table.actions")}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center">
                <Database className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
                <p className="mb-2 text-lg font-semibold">{t("pages:admin.datastores.empty.title")}</p>
                <p className="text-muted-foreground text-sm">{t("pages:admin.datastores.empty.description")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
