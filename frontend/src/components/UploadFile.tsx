import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { WorkloadNames } from "@/components/inputs/WorkloadNames";
import { DatePicker } from "@/components/inputs/DatePicker";
import { AlertMessage, type Alert } from "@/components/AlertMessage";
import { getTodayDateOnly } from "@/utils/date";
import { getReposForWorkloadId } from "@/config";
import client from "@/api/client";
import { VULNERABILITIES } from "@/api/endpoints";
import { useI18n } from "@/hooks/useI18n";

export function UploadFile() {
  const { t } = useI18n();
  const [workload, setWorkload] = useState<string>("");
  const [repoName, setRepoName] = useState<string>("");
  const [repoNames, setRepoNames] = useState<string[]>([]);
  const [reportDate, setReportDate] = useState<Date | undefined>(() => {
    const today = getTodayDateOnly();
    return today ? new Date(today) : undefined;
  });
  const [chosenFile, setChosenFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<Alert>(null);

  const updateWorkload = useCallback((workloadId: string | string[] | null) => {
    const id = Array.isArray(workloadId) ? workloadId[0] : workloadId;
    if (id) {
      setWorkload(id);
      setRepoNames(getReposForWorkloadId(id));
    }
  }, []);

  const onFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target;
    if (target.files && target.files.length > 0) {
      setChosenFile(target.files[0]);
    }
  }, []);

  const upload = useCallback(async () => {
    if (!chosenFile) {
      setAlert({
        type: "error",
        message: "No SARIF file selected.",
      });
      return;
    }

    setBusy(true);
    setAlert(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const params = {
            workload,
            repoName,
            reportDate: reportDate?.toISOString().split("T")[0] ?? "",
          };
          // Parse the SARIF JSON so the client can serialize it correctly
          const sarifContent = JSON.parse(reader.result as string);
          const response = await client.post(VULNERABILITIES, sarifContent, {
            headers: {
              "Content-Type": "application/json",
            },
            params,
          });

          if (response.status === 201) {
            setAlert({
              type: "success",
              message: "SARIF file uploaded successfully.",
            });
          } else {
            setAlert({
              type: "error",
              message: `HTTP ${response.status} uploading SARIF file`,
            });
          }
        } catch (error) {
          console.error("Failed to upload SARIF file", error);
          setAlert({
            type: "error",
            message: (error as Error).message,
          });
        } finally {
          setBusy(false);
        }
      };
      reader.readAsText(chosenFile);
    } catch (error) {
      console.error("Failed to read file", error);
      setAlert({
        type: "error",
        message: (error as Error).message,
      });
      setBusy(false);
    }
  }, [chosenFile, workload, repoName, reportDate]);

  return (
    <Card className="card-elevated">
      <CardHeader className="border-border/50 border-b pb-4">
        <CardTitle>{t("components:uploadFile.title")}</CardTitle>
        <CardDescription>{t("components:uploadFile.description")}</CardDescription>
      </CardHeader>

      {alert && (
        <CardContent>
          <AlertMessage alert={alert} />
        </CardContent>
      )}

      <CardContent>
        <div className="max-w-md space-y-4">
          <WorkloadNames multiSelect={false} onChange={updateWorkload} disabled={busy} />
          <Combobox
            value={repoName}
            onChange={(value) => setRepoName((value as string) ?? "")}
            options={repoNames.map((r) => ({ value: r, label: r }))}
            placeholder={t("components:uploadFile.repoName")}
            label={t("components:uploadFile.repoName")}
          />
          <DatePicker label={t("components:uploadFile.reportDate")} value={reportDate} onChange={setReportDate} />
          <div className="space-y-1">
            <Label>{t("components:uploadFile.sarifFile")}</Label>
            <Input type="file" accept=".sarif" disabled={busy} onChange={onFileChange} />
          </div>
          <Button variant="default" onClick={upload} disabled={busy || !workload || !chosenFile}>
            {t("components:uploadFile.upload")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
