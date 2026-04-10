import { useState, useEffect } from "react";
import { PageBreadcrumbs } from "@/components/layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Paths } from "@/router/paths";
import { useDashboards, useDashboard } from "@/queries/useDashboards";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { useI18n } from "@/hooks/useI18n";

export default function Dashboards() {
  const { t } = useI18n();
  const { data: dashboards, isLoading: isDashboardsLoading, error: dashboardsError } = useDashboards();
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | undefined>();

  const { data: dashboard, isLoading: isDashboardLoading } = useDashboard(selectedDashboardId);

  // Set first dashboard as default when loaded (derived state)
  const effectiveDashboardId =
    selectedDashboardId || (dashboards && dashboards.length > 0 ? dashboards[0].id : undefined);

  // Update selected dashboard if it was auto-selected
  useEffect(() => {
    if (!selectedDashboardId && effectiveDashboardId) {
      // Defer state update to avoid cascading renders
      setTimeout(() => setSelectedDashboardId(effectiveDashboardId), 0);
    }
  }, [selectedDashboardId, effectiveDashboardId]);

  const breadcrumbs = [
    { label: t("pages:explore.title"), to: Paths.Explore },
    { label: t("pages:dashboards.title"), to: Paths.SavedDashboards },
  ];

  return (
    <div>
      <div className="header-section">
        <div className="relative z-10 container mx-auto px-4 py-8">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="mt-2 text-4xl font-bold">{t("pages:dashboards.title")}</h2>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {dashboardsError && <p className="text-muted-foreground">{t("pages:dashboards.noAvailable")}</p>}

        {!dashboardsError && dashboards?.length === 0 && (
          <p className="text-muted-foreground">{t("pages:dashboards.noAvailable")}</p>
        )}

        {!dashboardsError && (
          <>
            {isDashboardsLoading && <Skeleton className="h-10 w-full max-w-sm" />}

            {dashboards && dashboards.length > 0 && (
              <Select value={selectedDashboardId} onValueChange={setSelectedDashboardId}>
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue placeholder={t("pages:dashboards.selectDashboard")} />
                </SelectTrigger>
                <SelectContent>
                  {dashboards.map((dash) => (
                    <SelectItem key={dash.id} value={dash.id}>
                      {dash.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {isDashboardLoading && (
              <div className="mt-4 grid grid-cols-12 gap-6">
                <div className="col-span-12 md:col-span-6">
                  <Skeleton className="h-64 w-full" />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <Skeleton className="h-64 w-full" />
                </div>
              </div>
            )}

            {dashboard && <Dashboard dashboard={dashboard} className="mt-4" />}
          </>
        )}
      </div>
    </div>
  );
}
