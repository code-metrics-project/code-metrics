import { verbose, warn } from "../../utils/logger/logger";
import { Workload, WorkloadId } from "../../model/config/workload-config";
import { getWorkloadById } from "../../config/configMapping";
import { DependencyAlertsTypes } from "../../model/config/common";
import { DependencyAlertsAnalysis, DependencySeverity } from "../../model/dependencyAlerts";
import { getConfigItemAsNumber } from "../../config/sources/source";

const builders: Record<string, () => DependencyAlertsService> = {};
const instances: Record<string, DependencyAlertsService> = {};

export const registerDependencyAlerts = (type: DependencyAlertsTypes, builder: () => DependencyAlertsService) => {
  verbose(`Registered dependency alerts implementation for: ${type}`);
  builders[type] = builder;
};

export const getDependencyAlertsForWorkload = (workload: Workload): DependencyAlertsService => {
  // TODO break out type to use a new workload dependencyAlerts object, using DependencyAlertsTypes
  // instead of reusing codemanagement type
  return getDependencyAlerts(workload.codeManagement.type);
};

export const getDependencyAlertsForWorkloadId = (workloadId: WorkloadId): DependencyAlertsService => {
  const workload = getWorkloadById(workloadId);
  return getDependencyAlertsForWorkload(workload);
};

const getDependencyAlerts = (type: string): DependencyAlertsService => {
  let instance = instances[type];
  if (!instance) {
    const builder = builders[type];
    if (!builder) {
      warn(`No dependency alerts implementation registered for type: ${type} - using noop implementation`);
      return getDependencyAlerts(DependencyAlertsTypes.NONE);
    }
    instance = builder();
    instances[type] = instance;
  }
  return instance;
};

export const DEPENDENCY_ALERTS_SLA_CONFIG: Record<DependencySeverity, number> = {
  [DependencySeverity.Critical]: getConfigItemAsNumber("DEPENDENCY_ALERT_CRITICAL", 7),
  [DependencySeverity.High]: getConfigItemAsNumber("DEPENDENCY_ALERT_HIGH", 14),
  [DependencySeverity.Medium]: getConfigItemAsNumber("DEPENDENCY_ALERT_MEDIUM", 30),
  [DependencySeverity.Low]: getConfigItemAsNumber("DEPENDENCY_ALERT_LOW", 60),
};

export type DependencyAlertsService = {
  fetchDependencyAlerts(
    workloadId: WorkloadId,
    repo?: string,
    repoGroups?: string[],
  ): Promise<DependencyAlertsAnalysis[]>;
};
