import { PipelinesTypes } from "./common";

export type StageConfig = {
  id: string;
  description: string;
  type: PipelinesTypes;
  serverId: string;
  projectName: string;

  commitMapping: {
    /**
     * The JsonPath to the property in the pipeline run that contains the commit ID,
     * e.g. `$.CommitHash`.
     */
    runProperty: string;
  };
};

export type StageConfigWrapper = {
  stages: StageConfig[];
};
