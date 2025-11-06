import { DependencyAlertsService, registerDependencyAlerts } from "./dependencyAlertsService";
import { DependencyAlertsTypes } from "../../model/config/common";
import { WorkloadId } from "../../model/config/workload-config";
import { DependencyAlertsAnalysis } from "../../model/dependencyAlerts";
import { warn } from "../../utils/logger/logger";

export const initNoopDependencyAlerts = () => {
  registerDependencyAlerts(DependencyAlertsTypes.NONE, () => new NoopDependencyAlertsService());
};

export class NoopDependencyAlertsService implements DependencyAlertsService {
  fetchDependencyAlerts(workloadId: WorkloadId, repo?: string, repoGroups?: string[]): Promise<DependencyAlertsAnalysis[]> {
    warn(`Dependency alerts service is not implemented for workload: ${workloadId}. Returning empty results for repo=${repo}, repoGroups=${repoGroups}.`);
    return Promise.resolve([]);
  }
}
