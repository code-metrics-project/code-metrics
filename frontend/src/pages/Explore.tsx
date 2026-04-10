import { Link } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Paths } from "@/router/paths";
import { PageBreadcrumbs } from "@/components/layout";
import { Settings, List, LayoutDashboard, LayoutGrid, ArrowRight } from "lucide-react";

export default function Explore() {
  const { t } = useI18n();
  return (
    <div>
      {/* Header */}
      <section className="header-section py-8">
        <div className="relative z-10 container mx-auto px-4">
          <PageBreadcrumbs items={[{ label: t("pages:explore.title") }]} />
          <h2 className="mt-2 text-3xl font-bold">{t("pages:explore.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("pages:explore.description")}</p>
        </div>
      </section>

      {/* Cards Grid */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Create Query Card */}
          <Card className="card-elevated card-action group flex flex-col">
            <CardHeader className="border-border/50 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br transition-all duration-300">
                  <Settings className="text-primary h-5 w-5" />
                </div>
                <CardTitle>{t("pages:explore.createQuery.title")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <p className="text-muted-foreground text-sm">{t("pages:explore.createQuery.description")}</p>
            </CardContent>
            <CardFooter className="border-border/30 border-t pt-4">
              <Button variant="link" asChild className="text-primary hover:text-primary/80 px-0">
                <Link to={Paths.NewQuery}>
                  {t("pages:explore.createQuery.action")}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Saved Queries Card */}
          <Card className="card-elevated card-action group flex flex-col">
            <CardHeader className="border-border/50 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br transition-all duration-300">
                  <List className="text-primary h-5 w-5" />
                </div>
                <CardTitle>{t("pages:explore.savedQueries.title")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <p className="text-muted-foreground text-sm">{t("pages:explore.savedQueries.description")}</p>
            </CardContent>
            <CardFooter className="border-border/30 border-t pt-4">
              <Button variant="link" asChild className="text-primary hover:text-primary/80 px-0">
                <Link to={Paths.SavedQueries}>
                  {t("pages:explore.savedQueries.action")}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Create Dashboard Card - Coming Soon */}
          <Card className="card-elevated flex cursor-not-allowed flex-col opacity-60">
            <CardHeader className="border-border/50 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                  <LayoutDashboard className="text-muted-foreground h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-muted-foreground">{t("pages:explore.createDashboard.title")}</CardTitle>
                  <span className="text-primary text-xs font-medium">{t("pages:explore.comingSoon")}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <p className="text-muted-foreground text-sm">{t("pages:explore.createDashboard.description")}</p>
            </CardContent>
            <CardFooter className="border-border/30 border-t pt-4">
              <Button variant="link" disabled className="text-muted-foreground px-0">
                {t("pages:explore.createDashboard.action")}
              </Button>
            </CardFooter>
          </Card>

          {/* Saved Dashboards Card */}
          <Card className="card-elevated card-action group flex flex-col">
            <CardHeader className="border-border/50 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br transition-all duration-300">
                  <LayoutGrid className="text-primary h-5 w-5" />
                </div>
                <CardTitle>{t("pages:explore.savedDashboards.title")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <p className="text-muted-foreground text-sm">{t("pages:explore.savedDashboards.description")}</p>
            </CardContent>
            <CardFooter className="border-border/30 border-t pt-4">
              <Button variant="link" asChild className="text-primary hover:text-primary/80 px-0">
                <Link to={Paths.SavedDashboards}>
                  {t("pages:explore.savedDashboards.action")}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
