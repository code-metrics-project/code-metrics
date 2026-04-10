import { DynamicQuery, type DynamicQueryInputs } from "@/components/DynamicQuery";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { addAuthQueryParam, getApiBaseUrl } from "@/api/client";
import { CODE_ANALYSIS_METRIC_HISTORY_CSV } from "@/api/endpoints";
import { useState, useCallback } from "react";
import { getCodeQualityDefaults } from "@/queries/queryDefaults";
import { useI18n } from "@/hooks/useI18n";

export function CodeAnalysisMetricHistory() {
  const { t } = useI18n();
  const [inputs, setInputs] = useState<DynamicQueryInputs>({});

  const handleInputChange = useCallback((newInputs: DynamicQueryInputs) => {
    setInputs(newInputs);
  }, []);

  const getHistoryAsCsv = useCallback(async () => {
    const workloads = inputs.workloads?.join(",") ?? "";
    const repoGroups = inputs.repoGroups?.join(",") ?? "";
    const startDate = inputs.startDate ?? "";

    const baseUrl =
      getApiBaseUrl() +
      CODE_ANALYSIS_METRIC_HISTORY_CSV +
      `?workloads=${workloads}` +
      `&repoGroups=${repoGroups}` +
      `&startDate=${startDate}`;

    const metricsCsvUrl = await addAuthQueryParam(baseUrl);
    console.log(`Redirecting to metrics CSV: ${metricsCsvUrl}`);
    document.location.href = metricsCsvUrl;
  }, [inputs]);

  return (
    <DynamicQuery
      title={t("components:codeAnalysis.historyTitle")}
      subtitle={t("components:codeAnalysis.historyDescription")}
      queryTypes={["code-coverage"]}
      defaultInputs={getCodeQualityDefaults()}
      hideChartSelector={true}
      onInputChange={handleInputChange}
    >
      <Button onClick={getHistoryAsCsv} variant="secondary" className="ml-2">
        <Download className="mr-2 h-4 w-4" />
        {t("components:codeAnalysis.downloadCsv")}
      </Button>
    </DynamicQuery>
  );
}

export default CodeAnalysisMetricHistory;
