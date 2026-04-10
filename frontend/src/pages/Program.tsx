import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Paths } from "@/router/paths";
import { PageBreadcrumbs } from "@/components/layout";
import { BarChart3, List, GitBranch, ShieldCheck, Shield, ShieldAlert, FolderGit2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

export default function Program() {
  const { t } = useI18n();
  return (
    <div>
      {/* Header */}
      <section className="header-section py-8">
        <div className="relative z-10 container mx-auto px-4">
          <PageBreadcrumbs items={[{ label: t("pages:program.title") }]} />
          <h2 className="mt-2 text-3xl font-bold">{t("pages:program.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("pages:program.description")}</p>
        </div>
      </section>

      {/* Cards Grid */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="card-elevated card-action group flex flex-col">
            <CardHeader className="border-border/50 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br transition-all duration-300">
                  <BarChart3 className="text-primary h-5 w-5" />
                </div>
                <CardTitle>{t("pages:program.metrics.title")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <p className="text-muted-foreground text-sm">{t("pages:program.metrics.description")}</p>
            </CardContent>
            <CardFooter className="border-border/30 border-t pt-4">
              <Button
                variant="outline"
                asChild
                className="group-hover:bg-primary group-hover:text-primary-foreground w-full transition-colors"
              >
                <Link to={Paths.ProgramMetrics}>{t("pages:program.metrics.action")}</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="card-elevated card-action group flex flex-col">
            <CardHeader className="border-border/50 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br transition-all duration-300">
                  <List className="text-primary h-5 w-5" />
                </div>
                <CardTitle>{t("pages:program.changes.title")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <p className="text-muted-foreground text-sm">{t("pages:program.changes.description")}</p>
            </CardContent>
            <CardFooter className="border-border/30 border-t pt-4">
              <Button
                variant="outline"
                asChild
                className="group-hover:bg-primary group-hover:text-primary-foreground w-full transition-colors"
              >
                <Link to={Paths.ProgramNarratives}>{t("pages:program.changes.action")}</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="card-elevated card-action group flex flex-col">
            <CardHeader className="border-border/50 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br transition-all duration-300">
                  <GitBranch className="text-primary h-5 w-5" />
                </div>
                <CardTitle>{t("pages:program.pipelines.title")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <p className="text-muted-foreground text-sm">{t("pages:program.pipelines.description")}</p>
            </CardContent>
            <CardFooter className="border-border/30 border-t pt-4">
              <Button
                variant="outline"
                asChild
                className="group-hover:bg-primary group-hover:text-primary-foreground w-full transition-colors"
              >
                <Link to={`${Paths.ProgramPipelineHealth}?executeImmediately=true&branchName=main`}>
                  {t("pages:program.pipelines.action")}
                </Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="card-elevated card-action group flex flex-col">
            <CardHeader className="border-border/50 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-green-500/20 to-green-500/5 transition-all duration-300 group-hover:from-green-500/30 group-hover:to-green-500/10">
                  <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>{t("pages:program.qualityGates.title")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <p className="text-muted-foreground text-sm">{t("pages:program.qualityGates.description")}</p>
            </CardContent>
            <CardFooter className="border-border/30 border-t pt-4">
              <Button
                variant="outline"
                asChild
                className="group-hover:bg-primary group-hover:text-primary-foreground w-full transition-colors"
              >
                <Link to={Paths.ProgramQualityGates}>{t("pages:program.qualityGates.action")}</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="card-elevated card-action group flex flex-col">
            <CardHeader className="border-border/50 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-amber-500/20 to-amber-500/5 transition-all duration-300 group-hover:from-amber-500/30 group-hover:to-amber-500/10">
                  <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <CardTitle>{t("pages:program.security.title")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <p className="text-muted-foreground text-sm">{t("pages:program.security.description")}</p>
            </CardContent>
            <CardFooter className="border-border/30 border-t pt-4">
              <Button
                variant="outline"
                asChild
                className="group-hover:bg-primary group-hover:text-primary-foreground w-full transition-colors"
              >
                <Link to={Paths.ProgramSecurity}>{t("pages:program.security.action")}</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="card-elevated card-action group flex flex-col">
            <CardHeader className="border-border/50 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-red-500/20 to-red-500/5 transition-all duration-300 group-hover:from-red-500/30 group-hover:to-red-500/10">
                  <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle>{t("pages:program.dependencyAlerts.title")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <p className="text-muted-foreground text-sm">{t("pages:program.dependencyAlerts.description")}</p>
            </CardContent>
            <CardFooter className="border-border/30 border-t pt-4">
              <Button
                variant="outline"
                asChild
                className="group-hover:bg-primary group-hover:text-primary-foreground w-full transition-colors"
              >
                <Link to={Paths.ProgramDependencyAlerts}>{t("pages:program.dependencyAlerts.action")}</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="card-elevated card-action group flex flex-col">
            <CardHeader className="border-border/50 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br transition-all duration-300">
                  <FolderGit2 className="text-primary h-5 w-5" />
                </div>
                <CardTitle>{t("pages:program.repositories.title")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <p className="text-muted-foreground text-sm">{t("pages:program.repositories.description")}</p>
            </CardContent>
            <CardFooter className="border-border/30 border-t pt-4">
              <Button
                variant="outline"
                asChild
                className="group-hover:bg-primary group-hover:text-primary-foreground w-full transition-colors"
              >
                <Link to={Paths.Repositories}>{t("pages:program.repositories.action")}</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
