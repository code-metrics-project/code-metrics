import { useEffect } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { Paths } from "@/router/paths";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { getErrorMessage } from "@/services/auth";

export default function Logout() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useAuthStore();

  const error = searchParams.get("error");
  const alertMessage = getErrorMessage(error);

  useEffect(() => {
    const performLogout = async () => {
      if (isAuthenticated) {
        await logout();
      }
      if (!error) {
        navigate(Paths.Login, { replace: true });
      }
    };

    performLogout();
  }, [logout, isAuthenticated, navigate, error]);

  if (error) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="mx-4 w-full max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("pages:logout.authenticationError")}</AlertTitle>
            <AlertDescription>{alertMessage?.message || error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground mt-4">{t("pages:logout.signingOut")}</p>
      </div>
    </div>
  );
}
