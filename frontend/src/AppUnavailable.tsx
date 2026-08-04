/**
 * Standalone AppUnavailable component that renders when the app cannot connect to the backend.
 * This is rendered outside of the React Router and other providers.
 */
import { ErrorAlertPanel } from "@/components/ErrorAlertPanel";
import { useTranslation } from "./hooks/useI18n";

export function AppUnavailable() {
  const { t } = useTranslation();

  return (
    <ErrorAlertPanel
      title={t("pages:appUnavailable.title")}
      description={t("pages:appUnavailable.description")}
      actionLabel={t("pages:appUnavailable.action")}
      onAction={() => window.location.reload()}
    />
  );
}
