import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Paths } from "@/router/paths";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

export default function ConfigMissing() {
  const { t } = useI18n();

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <Card className="mx-4 max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("pages:configMissing.title")}</CardTitle>
          <CardDescription>{t("pages:configMissing.title")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("pages:configMissing.title")}</AlertTitle>
            <AlertDescription>{t("pages:configMissing.message")}</AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("buttons:retry")}
            </Button>
            <Button asChild className="flex-1">
              <Link to={Paths.Home}>
                <Home className="mr-2 h-4 w-4" />
                {t("pages:home.title")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
