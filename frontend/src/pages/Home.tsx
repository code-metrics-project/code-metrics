import { Link } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Paths } from "@/router/paths";
import { Users, User, Wrench } from "lucide-react";
import { HomeHero } from "@/components/HomeHero";

export default function Home() {
  const { t } = useI18n();
  return (
    <div className="min-h-[calc(100vh-128px)]">
      <HomeHero />

      {/* Cards Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="card-elevated card-action group flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 icon-float flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br transition-all duration-300">
                  <Users className="text-primary h-8 w-8" />
                </div>
                <CardTitle>{t("pages:home.programme.title")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-muted-foreground">{t("pages:home.programme.description")}</p>
            </CardContent>
            <CardFooter>
              <Button
                asChild
                variant="outline"
                className="group-hover:bg-primary group-hover:text-primary-foreground w-full transition-colors duration-300"
              >
                <Link to={Paths.Program}>{t("pages:home.programme.action")}</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="card-elevated card-action group flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 icon-float flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br transition-all duration-300">
                  <User className="text-primary h-8 w-8" />
                </div>
                <CardTitle>{t("pages:home.workload.title")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-muted-foreground">{t("pages:home.workload.description")}</p>
            </CardContent>
            <CardFooter>
              <Button
                asChild
                variant="outline"
                className="group-hover:bg-primary group-hover:text-primary-foreground w-full transition-colors duration-300"
              >
                <Link to={Paths.Workloads}>{t("pages:home.workload.action")}</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="card-elevated card-action group flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 icon-float flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br transition-all duration-300">
                  <Wrench className="text-primary h-8 w-8" />
                </div>
                <CardTitle>{t("pages:home.explore.title")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-muted-foreground">{t("pages:home.explore.description")}</p>
            </CardContent>
            <CardFooter>
              <Button
                asChild
                variant="outline"
                className="group-hover:bg-primary group-hover:text-primary-foreground w-full transition-colors duration-300"
              >
                <Link to={Paths.Explore}>{t("pages:home.explore.action")}</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
