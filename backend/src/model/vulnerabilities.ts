export enum Severity {
  Critical = 10,
  High = 8,
  Medium = 4,
  Low = 2,
}

export type Vulnerability = {
  severity: Severity;
  repoName: string;
  raised: Date;
  message: string;
};

export type SarifResultLevel = "none" | "note" | "warning" | "error";

type SarifResult = {
  message?: string;
  id?: string;
  level?: SarifResultLevel;
};

export type SarifRun = {
  tool: {
    driver: {
      name: string;
    };
  };
  results: SarifResult[];
  versionControlProvenance?: {
    repositoryUri: string;
  }[];
};

export type LightweightSarif = {
  runs: SarifRun[];
};
