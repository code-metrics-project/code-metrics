import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Paths } from "@/router/paths";
import { Home, ArrowLeft } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-muted-foreground/50 text-9xl font-bold">404</h1>
        <h2 className="mt-4 mb-2 text-2xl font-semibold">{t("pages:notFound.title")}</h2>
        <p className="text-muted-foreground mb-8">{t("pages:notFound.description")}</p>
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("components:back")}
          </Button>
          <Button asChild>
            <Link to={Paths.Home}>
              <Home className="mr-2 h-4 w-4" />
              {t("nav:home")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
