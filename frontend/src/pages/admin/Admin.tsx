import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Paths } from "@/router/paths";
import { Key, Database, Network } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageBreadcrumbs } from "@/components/layout";

export default function Admin() {
  const { t } = useI18n();
  const breadcrumbs = [{ label: t("pages:admin.title") }];

  return (
    <div>
      <div className="header-section">
        <div className="relative z-10 container mx-auto px-4 py-8">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="pb-4 text-3xl font-bold">{t("pages:admin.title")}</h2>
          <p className="py-1 text-base">{t("pages:admin.description")}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Card className="card-elevated card-action group flex h-full flex-col">
            <CardHeader className="border-border/50 flex flex-row items-center gap-3 border-b pb-4">
              <div className="from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br transition-all duration-300">
                <Key className="text-primary h-5 w-5" />
              </div>
              <CardTitle>{t("pages:admin.cards.tokens.title")}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <p className="text-muted-foreground text-sm">{t("pages:admin.cards.tokens.description")}</p>
            </CardContent>
            <CardFooter className="border-border/30 border-t pt-4">
              <Button
                variant="outline"
                asChild
                className="group-hover:bg-primary group-hover:text-primary-foreground w-full transition-colors"
              >
                <Link to={Paths.AdminTokens}>{t("pages:admin.cards.tokens.action")}</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="card-elevated card-action group flex h-full flex-col">
            <CardHeader className="border-border/50 flex flex-row items-center gap-3 border-b pb-4">
              <div className="from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br transition-all duration-300">
                <Database className="text-primary h-5 w-5" />
              </div>
              <CardTitle>{t("pages:admin.cards.datastores.title")}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <p className="text-muted-foreground text-sm">{t("pages:admin.cards.datastores.description")}</p>
            </CardContent>
            <CardFooter className="border-border/30 border-t pt-4">
              <Button
                variant="outline"
                asChild
                className="group-hover:bg-primary group-hover:text-primary-foreground w-full transition-colors"
              >
                <Link to={Paths.AdminDatastores}>{t("pages:admin.cards.datastores.action")}</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="card-elevated card-action group flex h-full flex-col">
            <CardHeader className="border-border/50 flex flex-row items-center gap-3 border-b pb-4">
              <div className="from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br transition-all duration-300">
                <Network className="text-primary h-5 w-5" />
              </div>
              <CardTitle>{t("pages:admin.cards.remoteConnections.title")}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <p className="text-muted-foreground text-sm">{t("pages:admin.cards.remoteConnections.description")}</p>
            </CardContent>
            <CardFooter className="border-border/30 border-t pt-4">
              <Button
                variant="outline"
                asChild
                className="group-hover:bg-primary group-hover:text-primary-foreground w-full transition-colors"
              >
                <Link to={Paths.AdminRemoteConnections}>{t("pages:admin.cards.remoteConnections.action")}</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
