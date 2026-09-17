import { FeatureConfig } from "../../utils/features";

import { WorkloadId } from "./workload-config";

export type RepoInfo = {
  name: string;
  url: string;
};

export type WorkloadMeta = {
  id: WorkloadId;
  name?: string;

  /**
   * Name of a built-in icon representing the workload, if configured.
   */
  icon?: string;

  /**
   * Colour representing the workload, if configured.
   */
  color?: string;

  /**
   * Repos grouped by repo group name.
   */
  repos: Record<string, RepoInfo[]>;

  /**
   * Job names grouped by job group name.
   */
  jobs: Record<string, string[]>;

  /**
   * Pipeline stage IDs.
   */
  pipelineStages: string[];
};

export type AuthSessionStoreMethod = "sessionstorage" | "cookie";

/**
 * Everything in this object can be seen
 * by an unauthenticated user. Anything
 * sensitive should be in `SystemConfig`
 */
export type BootstrapConfig = {
  apiVersion: string;
  auth: {
    loginUrl?: string;
    store: AuthSessionStoreMethod;
  };
  configCacheTtlMs: number;
  features: FeatureConfig;
  hasConfig: boolean;
  hasWorkloads: boolean;
  isLicensed: boolean;
};

export type SystemConfig = {
  branches: string[];
  issuePriorities: string[];
  tags: Record<string, string[]>;
  workloads: WorkloadMeta[];
  llmEnabled: boolean;
};
