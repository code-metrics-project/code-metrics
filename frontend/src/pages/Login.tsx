import { useState, useEffect } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthStore } from "@/store/auth";
import { Paths } from "@/router/paths";
import { getErrorMessage } from "@/services/auth";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { getBootstrap, getConfig } from "@/config";

export default function Login() {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, status, fetchAndClearDestination, checkAuthState, isAuthenticated } = useAuthStore();

  const error = searchParams.get("error");
  const alertMessage = getErrorMessage(error || status);
  const isValid = username.length > 0 && password.length > 0;

  // Check if this is an OIDC callback (has code parameter)
  const hasAuthCode = searchParams.has("code");

  // Check if external login (OIDC/Keycloak) is configured
  const bootstrap = getBootstrap();
  const isExternalLogin = !!bootstrap?.auth?.loginUrl;

  // Check if auth is not required (auto-login with provided credentials)
  const webConfig = getConfig().webConfig;
  const authRequired = webConfig?.auth?.required ?? true;
  const providedCredentials = webConfig?.auth?.provided;

  // Auto-login when auth is not required and credentials are provided
  useEffect(() => {
    if (!authRequired && providedCredentials && !isAuthenticated && !isAutoLoggingIn) {
      setIsAutoLoggingIn(true);
      (async () => {
        try {
          console.log("[Login] Auto-login with provided credentials");
          await login(providedCredentials.user ?? "", providedCredentials.pass ?? "");
        } catch (e) {
          console.error("Auto-login failed", e);
        } finally {
          setIsAutoLoggingIn(false);
        }
      })();
    }
  }, [authRequired, providedCredentials, isAuthenticated, isAutoLoggingIn, login]);

  // Redirect to external login URL if configured (and not already in callback flow)
  useEffect(() => {
    if (isExternalLogin && !hasAuthCode && !isAuthenticated) {
      const loginUrl = bootstrap.auth.loginUrl!;
      const fullLoginUrl = loginUrl.startsWith("/") ? getConfig().webConfig.apiBaseUrl + loginUrl : loginUrl;
      console.log("[Login] Redirecting to external login:", fullLoginUrl);
      window.location.href = fullLoginUrl;
    }
  }, [isExternalLogin, hasAuthCode, isAuthenticated, bootstrap]);

  // Handle OIDC callback - when we arrive with a code parameter
  useEffect(() => {
    if (hasAuthCode && !isAuthenticated) {
      setIsCheckingAuth(true);
      (async () => {
        try {
          await checkAuthState();
        } catch (e) {
          console.error("Error checking authentication state", e);
        } finally {
          setIsCheckingAuth(false);
        }
      })();
    }
  }, [hasAuthCode, checkAuthState, isAuthenticated]);

  // Navigate to home when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const destination = fetchAndClearDestination();
      if (destination) {
        navigate(destination.path, { replace: true });
      } else {
        navigate(Paths.Home, { replace: true });
      }
    }
  }, [isAuthenticated, fetchAndClearDestination, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log("[Login] handleSubmit called with username:", username);

    try {
      console.log("[Login] calling login()...");
      const success = await login(username, password);
      console.log("[Login] login() returned:", success);
      if (success) {
        // Navigate directly on success - simpler and more reliable than useEffect
        const destination = fetchAndClearDestination();
        console.log("[Login] destination:", destination);
        if (destination) {
          console.log("[Login] navigating to destination:", destination.path);
          navigate(destination.path, { replace: true });
        } else {
          console.log("[Login] navigating to Home:", Paths.Home);
          navigate(Paths.Home, { replace: true });
        }
      } else {
        console.log("[Login] login not successful, not navigating");
      }
      // If not success, the error status is set in the store and will display
    } catch (err) {
      console.error("[Login] error during login:", err);
      // Network/unexpected error - handled by the store
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state when checking OIDC auth, redirecting to external login, or auto-logging in
  if (isCheckingAuth || hasAuthCode || isExternalLogin || isAutoLoggingIn || (!authRequired && providedCredentials)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("pages:login.pleaseWait")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {alertMessage ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{alertMessage.message}</AlertDescription>
              </Alert>
            ) : (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t("pages:login.checkingStatus")}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>{t("pages:login.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {alertMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{alertMessage.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">{t("pages:login.username")}</Label>
              <Input
                id="username"
                autoComplete="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("pages:login.usernamePlaceholder")}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("pages:login.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("pages:login.passwordPlaceholder")}
                  disabled={isLoading}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={!isValid || isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("pages:login.button")}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
