import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Circle, ArrowRight } from "lucide-react";
import { getWorkloadDetails } from "@/services/workload";
import { Paths } from "@/router/paths";
import { useI18n } from "@/hooks/useI18n";

export default function Workloads() {
  const { t } = useI18n();
  const workloads = getWorkloadDetails();

  return (
    <div>
      {/* Header */}
      <section className="header-section py-8">
        <div className="relative z-10 container mx-auto px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{t("nav:workload")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h2 className="mt-2 text-3xl font-bold">{t("pages:workloads.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("pages:workloads.description")}</p>
        </div>
      </section>

      {/* Workload Cards */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {workloads.map((workload) => (
            <Card key={workload.id} className="card-elevated card-action group flex flex-col">
              <CardHeader className="border-border/50 border-b pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${workload.color}30 0%, ${workload.color}10 100%)`,
                    }}
                  >
                    <Circle className="h-5 w-5" style={{ color: workload.color }} fill={workload.color} />
                  </div>
                  <CardTitle>{workload.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pt-4">
                <ul className="space-y-2">
                  {Object.entries(workload.repos).map(([repo, count]) => (
                    <li key={repo} className="flex items-center gap-2 text-sm">
                      <span className="bg-primary/60 h-1.5 w-1.5 rounded-full"></span>
                      <span className="font-medium">{repo}</span>
                      <span className="text-muted-foreground ml-auto">
                        {count === 0 ? "No repos" : count === 1 ? "1 repo" : `${count} repos`}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={`${Paths.WorkloadRepositories}?workloadId=${workload.id}`}
                  className="text-muted-foreground hover:text-primary mt-3 block text-xs transition-colors"
                >
                  {t("components:viewRepositories")}
                </Link>
              </CardContent>
              <CardFooter className="border-border/30 border-t pt-4">
                <Button variant="link" asChild className="text-primary hover:text-primary/80 px-0">
                  <Link to={`${Paths.Workloads}/${workload.id}`}>
                    {t("components:viewWorkload")}
                    <ArrowRight className="ml-1 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
