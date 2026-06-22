import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, RefreshCw } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

interface ConfigChangeBannerProps {
  onReload: () => void;
}

export function ConfigChangeBanner({ onReload }: ConfigChangeBannerProps) {
  const { t } = useI18n();

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] p-4">
      <Alert className="mx-auto max-w-4xl border-blue-500 bg-blue-50 dark:bg-blue-950">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-900 dark:text-blue-100">
          {t("components:configChangeBanner.title")}
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span className="text-blue-800 dark:text-blue-200">
            {t("components:configChangeBanner.message")}
          </span>
          <Button onClick={onReload} variant="default" size="sm" className="shrink-0">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("common:reload")}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
