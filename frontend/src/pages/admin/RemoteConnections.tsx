import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Paths } from "@/router/paths";
import { Network, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { checkRemoteConnections, type ConnectionCheckResult, type ConnectionStatus } from "@/services/remoteConnections";
import { useI18n } from "@/hooks/useI18n";
import { PageBreadcrumbs } from "@/components/layout";

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  connected: { variant: "default", className: "bg-green-500 hover:bg-green-600" },
  unreachable: { variant: "destructive" },
  unauthorised: { variant: "secondary", className: "bg-amber-500 hover:bg-amber-600" },
  error: { variant: "destructive" },
  unconfigured: { variant: "outline" },
  rateLimited: { variant: "secondary", className: "bg-orange-500 hover:bg-orange-600" },
};

export default function RemoteConnections() {
  const { t } = useI18n();
  const breadcrumbs = [
    { label: t("pages:admin.title"), to: Paths.AdminHome },
    { label: t("pages:admin.remoteConnections.title") },
  ];
  const [results, setResults] = useState<ConnectionCheckResult[]>([]);
  const [checkedAt, setCheckedAt] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await checkRemoteConnections();
      setResults(data.results);
      setCheckedAt(data.checkedAt);
    } catch (error) {
      console.error("Failed to check remote connections:", error);
      toast.error(t("pages:admin.remoteConnections.toast.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const formatResponseTime = (ms?: number) => {
    if (ms === undefined) return "-";
    return `${ms}ms`;
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <div>
      <div className="header-section">
        <div className="relative z-10 container mx-auto px-4 py-8">
          <PageBreadcrumbs items={breadcrumbs} />
          <div className="flex items-start justify-between">
            <div>
              <h2 className="mt-4 pb-4 text-3xl font-bold">{t("pages:admin.remoteConnections.title")}</h2>
              <p className="text-muted-foreground text-base">{t("pages:admin.remoteConnections.description")}</p>
            </div>
            <Button onClick={loadConnections} disabled={loading} className="mt-4">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {t("pages:admin.remoteConnections.refresh")}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                {t("pages:admin.remoteConnections.table.title")}
              </div>
              {checkedAt && (
                <span className="text-muted-foreground text-sm font-normal">
                  {t("pages:admin.remoteConnections.lastChecked")}: {formatTimestamp(checkedAt)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              </div>
            ) : results.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("pages:admin.remoteConnections.table.serverId")}</TableHead>
                    <TableHead>{t("pages:admin.remoteConnections.table.category")}</TableHead>
                    <TableHead>{t("pages:admin.remoteConnections.table.type")}</TableHead>
                    <TableHead>{t("pages:admin.remoteConnections.table.url")}</TableHead>
                    <TableHead>{t("pages:admin.remoteConnections.table.status")}</TableHead>
                    <TableHead>{t("pages:admin.remoteConnections.table.detail")}</TableHead>
                    <TableHead className="text-right">
                      {t("pages:admin.remoteConnections.table.responseTime")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={`${result.id}-${index}`}>
                      <TableCell className="font-mono">{result.id}</TableCell>
                      <TableCell className="capitalize">{result.category.replace(/([A-Z])/g, " $1").trim()}</TableCell>
                      <TableCell className="font-mono text-sm">{result.type}</TableCell>
                      <TableCell className="max-w-xs truncate font-mono text-sm" title={result.url}>
                        {result.url || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_CONFIG[result.status].variant} className={STATUS_CONFIG[result.status].className}>
                          {t(`pages:admin.remoteConnections.status.${result.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm" title={result.statusDetail}>
                        {result.statusDetail || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatResponseTime(result.responseTimeMs)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center">
                <Network className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
                <p className="mb-2 text-lg font-semibold">{t("pages:admin.remoteConnections.empty.title")}</p>
                <p className="text-muted-foreground text-sm">{t("pages:admin.remoteConnections.empty.description")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
