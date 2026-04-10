import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RunResult, type RunWithMetadata } from "@/model/runs";

interface RunDetailsProps {
  item: RunWithMetadata;
}

function getResultVariant(result: RunResult): "default" | "destructive" | "secondary" | "outline" {
  switch (result) {
    case RunResult.Succeeded:
      return "default";
    case RunResult.Failed:
      return "destructive";
    case RunResult.Aborted:
      return "secondary";
    default:
      return "outline";
  }
}

export function RunDetails({ item }: RunDetailsProps) {
  const { run, workloadId, stageId, jobGroup } = item;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Run #{run.id}
          <Badge variant={getResultVariant(run.result)}>{run.result}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-sm font-medium">Workload</dt>
            <dd>{workloadId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm font-medium">Job</dt>
            <dd>{run.job}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm font-medium">Job Group</dt>
            <dd>{jobGroup}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm font-medium">Stage</dt>
            <dd>{stageId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm font-medium">Branch</dt>
            <dd>{run.branch}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm font-medium">Start date</dt>
            <dd>{run.startDate}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm font-medium">Duration</dt>
            <dd>{run.duration}s</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm font-medium">Repository</dt>
            <dd>{run.repo}</dd>
          </div>
          {run.user && (
            <div>
              <dt className="text-muted-foreground text-sm font-medium">User</dt>
              <dd>{run.user}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
