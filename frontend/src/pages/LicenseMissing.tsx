import { ErrorAlertPanel } from "@/components/ErrorAlertPanel";
import { useI18n } from "@/hooks/useI18n";

export default function LicenseMissing() {
  const { t } = useI18n();

  const handleRetry = () => {
    window.location.href = window.location.origin;
  };

  return (
    <ErrorAlertPanel
      title={t("pages:licenseMissing.title")}
      description={`${t("pages:licenseMissing.message")} ${t("pages:licenseMissing.administrator")}.`}
      actionLabel={t("common:retry")}
      onAction={handleRetry}
      testId="license-missing-alert"
    />
  );
}
