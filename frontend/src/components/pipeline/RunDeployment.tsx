import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { convertRunToRow, lookupDeploymentRuns, type RunRow, type RunWithMetadata } from "@/services/pipelines";
import { RunResult } from "@/model/runs";
import { Loader2, CheckCircle, AlertCircle, XCircle, Circle } from "lucide-react";

interface RunDeploymentProps {
  item: RunWithMetadata;
}

export function RunDeployment({ item }: RunDeploymentProps) {
  const [deployments, setDeployments] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDeployments() {
      try {
        setLoading(true);
        setError(null);
        const runs = await lookupDeploymentRuns(item);
        const runRows = runs.map((d) => convertRunToRow(d));
        setDeployments(runRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load deployments");
        setDeployments([]);
      } finally {
        setLoading(false);
      }
    }

    loadDeployments();
  }, [item]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          <span className="text-muted-foreground ml-2">Loading deployments...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!deployments.length) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Unable to find deployments for this run.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getResultIcon = (result: RunResult) => {
    switch (result) {
      case RunResult.Succeeded:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case RunResult.Failed:
        return <XCircle className="h-5 w-5 text-red-500" />;
      case RunResult.Aborted:
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      default:
        return <Circle className="text-muted-foreground h-5 w-5" />;
    }
  };

  return (
    <>
      {deployments.map((runRow) => (
        <Card key={runRow.key} className="card-elevated">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{runRow.title}</CardTitle>
                <CardDescription className="mt-2 flex items-center gap-2">
                  {getResultIcon(runRow.result)}
                  <span>{runRow.result}</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Started</p>
                  <p className="mt-1 text-sm">{new Date(runRow.date).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Repository</p>
                  <p className="mt-1 text-sm">{runRow.repo}</p>
                </div>
              </div>
              {runRow.duration > 0 && (
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Duration</p>
                  <p className="mt-1 text-sm">{Math.round(runRow.duration / 1000)}s</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
