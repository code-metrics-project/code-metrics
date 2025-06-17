import type { FeatureConfig } from "@/utils/features";

export type RepoInfo = {
  name: string;
  url: string;
};

export type WorkloadMeta = {
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
};

export type AuthSessionStoreMethod = "sessionstorage" | "cookie";

export type BootstrapConfig = {
  apiVersion: string;
  auth: {
    loginUrl?: string;
    store: AuthSessionStoreMethod;
  };
  features: FeatureConfig;
};

export type SystemConfig = {
  branches: string[];
  issuePriorities: string[];
  tags: Record<string, string[]>;
  workloads: WorkloadMeta[];
};

export type WebConfig = {
  apiBaseUrl: string;
  auth: {
    required: boolean;
    provided?: {
      user: string;
      pass: string;
    };
  };
};

export type WorkloadInfo = {
  id: string;
  name: string;
};

export type WorkloadDetail = WorkloadInfo & {
  color: string;
  repos: Record<string, number>;
};
