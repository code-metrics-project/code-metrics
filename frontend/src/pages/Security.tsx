import { useSearchParams } from "react-router-dom";
import { PageBreadcrumbs } from "@/components/layout";
import { SecurityVulnerabilities } from "@/components/SecurityVulnerabilities";
import { UploadFile } from "@/components/UploadFile";
import { Paths } from "@/router/paths";
import { useI18n } from "@/hooks/useI18n";

export default function Security() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const workloadId = searchParams.get("workloadId") ?? undefined;
  const executeImmediately = searchParams.get("executeImmediately") === "true";
  const branchNamesParam = searchParams.get("branchNames");
  const branchNames = branchNamesParam ? branchNamesParam.split(",") : undefined;
  const breadcrumbs = [{ label: t("nav:programme"), to: Paths.Program }, { label: t("nav:security") }];

  return (
    <div>
      {/* Header */}
      <section className="header-section py-8">
        <div className="relative z-10 container mx-auto px-4">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="mt-2 text-3xl font-bold">{t("pages:security.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("pages:security.description")}</p>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto space-y-8 px-4 py-8">
        <div>
          <SecurityVulnerabilities
            workload={workloadId}
            branchNames={branchNames}
            executeOnMount={executeImmediately}
          />
        </div>
        <div>
          <UploadFile />
        </div>
      </div>
    </div>
  );
}
