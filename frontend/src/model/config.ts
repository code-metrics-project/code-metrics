import type { FeatureConfig } from "@/config";

export interface RepoInfo {
  name: string;
  url: string;
}

export interface WorkloadMeta {
  id: string;
  name?: string;

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
}

export type AuthSessionStoreMethod = "sessionstorage" | "cookie";

export interface BootstrapConfig {
  apiVersion: string;
  auth: {
    loginUrl?: string;
    store: AuthSessionStoreMethod;
  };
  configCacheTtlMs?: number;
  features: FeatureConfig;
  hasConfig: boolean;
  hasWorkloads?: boolean;
  isLicensed: boolean;
}

export interface SystemConfig {
  branches: string[];
  issuePriorities: string[];
  tags: Record<string, string[]>;
  workloads: WorkloadMeta[];
  llmEnabled?: boolean;
}

export interface WebConfig {
  apiBaseUrl: string;
  auth: {
    required: boolean;
    provided?: {
      user: string;
      pass: string;
    };
  };
}

export interface WorkloadInfo {
  id: string;
  name: string;
}

export type WorkloadDetail = WorkloadInfo & {
  color: string;
  repos: Record<string, number>;
};
