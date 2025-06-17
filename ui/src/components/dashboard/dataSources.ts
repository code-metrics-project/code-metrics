import { QueryName } from "@/queries/queries";
import { useCMQuery } from "@/vue-queries/query";

type TDataSource = (options?: any) => ReturnType<typeof useCMQuery>;

export const dataSources = {
  newBugs: (args) =>
    useCMQuery({
      queryName: QueryName.BugsNew,
      args,
    }),
  openBugs: (args) =>
    useCMQuery({
      queryName: QueryName.BugsOpen,
      args,
    }),
  changeFailureRate: (args) =>
    useCMQuery({
      queryName: QueryName.ChangeFailureRate,
      args,
    }),
  codeCoverage: (args) =>
    useCMQuery({
      queryName: QueryName.CodeCoverage,
      args,
    }),
  deploymentFrequency: (args) =>
    useCMQuery({
      queryName: QueryName.DeploymentFrequency,
      args,
    }),
  incidents: (args) =>
    useCMQuery({
      queryName: QueryName.ProductionIncidents,
      args,
    }),
  leadTimeForChanges: (args) =>
    useCMQuery({
      queryName: QueryName.LeadTimeForChanges,
      args,
    }),
  pipelineRuns: (args) =>
    useCMQuery({
      queryName: QueryName.PipelineRuns,
      args,
    }),
  prOpenTime: (args) =>
    useCMQuery({
      queryName: QueryName.PROpenTime,
      args,
    }),
  repoChurn: (args) =>
    useCMQuery({
      queryName: QueryName.RepoChurn,
      args,
    }),
  timeToRestoreService: (args) =>
    useCMQuery({
      queryName: QueryName.TimeToRestoreService,
      args,
    }),
  vulnerabilities: (args) =>
    useCMQuery({
      queryName: QueryName.Vulnerabilities,
      args,
    }),
} satisfies Record<string, TDataSource>;

export type TDataSourceType = {
  [K in keyof typeof dataSources]: {
    name: K;
    args: Parameters<(typeof dataSources)[K]>[0];
  };
}[keyof typeof dataSources];
