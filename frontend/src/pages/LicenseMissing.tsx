import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

export default function LicenseMissing() {
  const { t } = useI18n();

  const handleRetry = () => {
    // Navigate to root to reinitialise the app and check license again
    window.location.href = window.location.origin;
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <Card className="mx-4 max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("pages:licenseMissing.title")}</CardTitle>
          <CardDescription>{t("pages:licenseMissing.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("pages:licenseMissing.title")}</AlertTitle>
            <AlertDescription>
              {t("pages:licenseMissing.message")} {t("pages:licenseMissing.administrator")}.
            </AlertDescription>
          </Alert>

          <Button className="w-full" onClick={handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("common:retry")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
