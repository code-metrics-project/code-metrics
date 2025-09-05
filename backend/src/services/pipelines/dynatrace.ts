import { AbstractPipelinesService, registerPipelines } from "./pipelinesService";
import { Run, RunResult, RunWithMetadata } from "../../model/runs";
import { logger, verbose, warn } from "../../utils/logger/logger";
import { getRelativeDate, truncateDateOnly } from "../../utils/date";
import { provideDatastore } from "../../db/factory";
import { getDataForDateRange, StorableLike } from "../dateWalker";
import { jsonPathQuery } from "../../utils/json";
import { listNormalisedJobGroupsForWorkload, lookupJobGroupForJobName } from "../../utils/jobs";
import { DynatraceServer } from "../../model/config/remote-config";
import { Workload, WorkloadId } from "../../model/config/workload-config";
import { getAllPipelinesConfig, getWorkloadById } from "../../config/configMapping";
import { StageConfig } from "../../model/config/pipeline-config";
import { mapJobNameUsingStageConfig } from "./common";
import { PipelinesTypes } from "../../model/config/common";
import { getConfigItemAsNumber } from "../../config/sources/source";

const COLLECTION_NAME = "dynatrace-events";
const EXPIRY_SECONDS: number = getConfigItemAsNumber("EXPIRY_SECONDS", 3600);
const SEARCH_DAYS_BACK = 365;

type DynatraceCacheItemFilter = {
  stageId: string;
  projectName: string;
  jobName: string;
  branch: string;
};

type PopulatedItem = StorableLike & DynatraceCacheItemFilter & { builds: Run[] };

/**
 * See https://docs.dynatrace.com/docs/dynatrace-api/environment-api/metric-v2/get-data-points#definition--MetricSeriesCollection
 */
type DynatraceMetricData = {
  resolution: string;
  result: DynatraceMetricSeriesCollection[];
  totalCount: number;
  warnings: string[];
};

type DynatraceMetricSeriesCollection = {
  data: DynatraceMetricSeries[];
  dataPointCountRatio?: string;
  dimensionCountRatio?: string;
  metricId: string;
  warnings?: string[];
};

type DynatraceDimensionMap = Record<string, string>;

type DynatraceMetricSeries = {
  dimensionMap?: DynatraceDimensionMap;
  dimensions: string[];
  timestamps: number[];
  values: number[];
};

class DynatraceClient {
  server: DynatraceServer;

  constructor(server: DynatraceServer) {
    this.server = server;
  }

  getMetrics = async (
    metricSelector: string,
    entitySelector: string | undefined,
    from: Date,
    to: Date,
  ): Promise<DynatraceMetricData> => {
    const url = new URL(`${this.server.url}/api/v2/metrics/query`);
    const headers = {
      Authorization: `Api-Token ${this.server.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    const queryParams = {
      metricSelector,

      // from and to must be specified or else they will default to now-2h and now respectively
      // see https://docs.dynatrace.com/docs/dynatrace-api/environment-api/metric-v2/get-data-points
      from: from?.toISOString(),
      to: to?.toISOString(),
    };
    if (entitySelector) {
      queryParams["entitySelector"] = entitySelector;
    }
    url.search = new URLSearchParams(queryParams).toString();

    verbose(`Querying dynatrace at`, url.toString());
    const response = await fetch(url, { headers });
    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await response.text();
      } catch (ignored) {
        // no-op
      }
      throw new Error(`Failed to fetch Dynatrace metrics: ${response.status} ${errorBody}`);
    } else {
      verbose(`Dynatrace response: ${response.status}`);
    }
    const body = await response.json();
    verbose(`Dynatrace response body`, body);
    return body;
  };
}

export const initDynatracePipelines = () =>
  registerPipelines(PipelinesTypes.DYNATRACE, (config) => new DynatracePipelinesService(config));

class DynatracePipelinesService extends AbstractPipelinesService {
  private datastore = provideDatastore("dynatrace-pipelines", { ttlIfToday: EXPIRY_SECONDS });
  private connections = new Map<WorkloadId, DynatraceClient>();

  constructor(stage: StageConfig) {
    super(stage);
  }

  async getConnection(workloadId: WorkloadId): Promise<DynatraceClient> {
    const connectionId = `${workloadId}/${this.stage.id}`;
    let connection: DynatraceClient = this.connections.get(connectionId);
    if (!connection) {
      const server = this.getServerConfig(workloadId);
      connection = new DynatraceClient(server);
      this.connections.set(connectionId, connection);
    }
    return connection;
  }

  private getServerConfig(workloadId: WorkloadId): DynatraceServer {
    const server: DynatraceServer = getAllPipelinesConfig().dynatrace.servers.find(
      (server) => server.id === this.stage.serverId,
    );
    if (!server) {
      throw new Error(`No Dynatrace server configuration found for workload: ${workloadId}`);
    }
    return server;
  }

  async getRunsForProject(
    workloadId: string,
    jobNames: string[],
    vcsProjectName: string,
    branches: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<Run[]> {
    const workload = getWorkloadById(workloadId);
    const connection = await this.getConnection(workloadId);
    const allRuns: Run[] = [];

    for (const jobName of jobNames) {
      for (const branch of branches) {
        const populator = async (current: Date): Promise<PopulatedItem> => {
          const next = getRelativeDate(current, 1);
          const builds = await this.getRuns(workload, current, next, connection, vcsProjectName, jobName, [branch]);
          return {
            date: truncateDateOnly(current),
            stageId: this.stage.id,
            branch,
            jobName,
            projectName: vcsProjectName,
            builds,
          };
        };

        const fields: DynatraceCacheItemFilter = {
          stageId: this.stage.id,
          projectName: vcsProjectName,
          jobName: jobName,
          branch,
        };
        const runs: PopulatedItem[] = await getDataForDateRange(
          COLLECTION_NAME,
          fields,
          startDate,
          endDate,
          this.datastore,
          populator,
        );
        allRuns.push(...runs.flatMap((r) => r.builds));
      }
    }
    return allRuns;
  }

  async getRunById(workloadId: WorkloadId, jobName: string, runId: string): Promise<RunWithMetadata | null> {
    const event = await this.getRawEvent(workloadId, jobName, runId);
    if (!event) {
      return null;
    }
    const jobGroup = lookupJobGroupForJobName(workloadId, jobName);
    const vcsProjectName = this.stage.projectName;
    const serverConfig = this.getServerConfig(workloadId);
    return {
      workloadId,
      stageId: this.stage.id,
      jobGroup,
      run: parseEvent(event, serverConfig, vcsProjectName, jobName),
    };
  }

  async getPipelineRunProperty(
    workloadId: WorkloadId,
    vcsProjectName: string,
    jobName: string,
    runId: string,
    propertyJsonPath: string,
  ): Promise<string | null> {
    logger(`Fetching property name ${propertyJsonPath} events from dynatrace: ${jobName} event ${runId}`);
    try {
      const event = await this.getRawEvent(workloadId, jobName, runId);

      const propertyValue = jsonPathQuery(event, propertyJsonPath);
      verbose(`Fetched property ${propertyJsonPath} from dynatrace: ${jobName} event ${runId}`, propertyValue);
      return propertyValue;
    } catch (e) {
      warn(`Failed to fetch property name ${propertyJsonPath} events from dynatrace: ${jobName} event ${runId}`, e);
      return null;
    }
  }

  discoverJobNames = async (workload: Workload, jobGroup: string): Promise<string[]> => {
    const jobGroups = listNormalisedJobGroupsForWorkload(workload);

    // TODO discover via API and filter as jobName can be a regex
    return jobGroups[jobGroup]?.jobNames ?? [];
  };

  buildRunLink = (workloadId: string, jobName: string, runId: string): string => {
    const server = getAllPipelinesConfig().dynatrace.servers.find((server) => server.id === this.stage.serverId);
    return `${server.url}`;
  };

  private async getRuns(
    workload: Workload,
    startDate: Date,
    endDate: Date,
    connection: DynatraceClient,
    vcsProjectName: string,
    jobName: string,
    branches: string[],
  ): Promise<Run[]> {
    jobName = mapJobNameUsingStageConfig(workload, jobName, this.stage.id);

    logger(`Fetching events from dynatrace: ${jobName} from ${startDate} to ${endDate}`);
    try {
      const serverConfig = connection.server;
      const filter = {
        [serverConfig.dimensionNames.jobName]: jobName,
      };
      const metricSelector = this.filterMetricSelector(serverConfig.metricSelector, serverConfig, filter);

      let runs: Run[] = [];
      await this.query(connection, { metricSelector, startDate, endDate }, (dataItem: DynatraceMetricSeries) => {
        const run = parseEvent(dataItem.dimensionMap, serverConfig, vcsProjectName, jobName);
        if (run) {
          runs.push(run);
        }
      });

      if (branches.length) {
        runs = runs.filter((run) => !run.branch || branches.includes(run.branch));
      }
      return runs;
    } catch (e) {
      warn(`Failed to fetch dynatrace events: ${jobName} from ${startDate} to ${endDate}`, e);
      return [];
    }
  }

  /**
   * Filters the metric selector by the given dimensions.
   * @param metricSelector
   * @param serverConfig
   * @param dimensions an array of dimension name and value known to Dynatrace
   * @private
   */
  private filterMetricSelector(
    metricSelector: string,
    serverConfig: DynatraceServer,
    dimensions: Record<string, string>,
  ): string {
    let selector = metricSelector;
    for (const [dimensionName, dimensionValue] of Object.entries(dimensions)) {
      selector = `${selector}:filter(eq("${dimensionName}","${dimensionValue}"))`;
      verbose(`Filtered metric selector for ${dimensionName}=${dimensionValue}`);
    }
    // trim newlines
    selector = selector.replace(/\n/g, "");
    verbose(`Built metric selector for dynatrace server ${serverConfig.id}`, selector);
    return selector;
  }

  private async query(
    connection: DynatraceClient,
    query: {
      metricSelector: string;
      startDate: Date;
      endDate: Date;
    },
    operation: (data: DynatraceMetricSeries) => void,
  ) {
    const resp = await connection.getMetrics(
      query.metricSelector,
      connection.server.entitySelector,
      query.startDate,
      query.endDate,
    );

    const results = resp.result;
    verbose(`Retrieved ${results.length} result wrapper items from dynatrace for query`, query);

    for (const result of results) {
      logger(`Parsing ${result.data.length} events from dynatrace for query`, query);
      for (const dataItem of result.data) {
        operation(dataItem);
      }
    }
  }

  private getRawEvent = async (
    workloadId: WorkloadId,
    jobName: string,
    runId: string,
  ): Promise<DynatraceDimensionMap> => {
    const workload = getWorkloadById(workloadId);
    jobName = mapJobNameUsingStageConfig(workload, jobName, this.stage.id);

    verbose(`Fetching events from dynatrace: ${jobName} stage: ${this.stage.id} event ${runId}`);
    const connection = await this.getConnection(workloadId);
    const serverConfig = connection.server;

    const filter = {
      [serverConfig.dimensionNames.jobName]: jobName,
      [serverConfig.dimensionNames.runId]: runId,
    };
    const metricSelector = this.filterMetricSelector(serverConfig.metricSelector, serverConfig, filter);

    // both startDate and endDate must be specified or else they will default to now-2h and now respectively
    const startDate = getRelativeDate(new Date(), -SEARCH_DAYS_BACK);
    const endDate = new Date();

    const events: DynatraceDimensionMap[] = [];
    await this.query(connection, { metricSelector, startDate, endDate }, (dataItem: DynatraceMetricSeries) => {
      if (dataItem.dimensionMap) {
        events.push(dataItem.dimensionMap);
      }
    });

    let event: DynatraceDimensionMap;
    switch (events.length) {
      case 0:
        warn(`Failed to find dynatrace event for ${jobName} event with metricSelector`, metricSelector);
        return null;
      case 1:
        event = events[0];
        break;
      default:
        warn(`Multiple dynatrace events for ${jobName} event with metricSelector - returning first`, metricSelector);
        event = events.toSorted()[0];
    }
    verbose(`Fetched dynatrace event for ${jobName} event with metricSelector`, metricSelector, event);
    return event;
  };
}

const parseEvent = (
  dimensionMap: DynatraceDimensionMap,
  serverConfig: DynatraceServer,
  vcsProjectName: string,
  jobName: string,
): Run | null => {
  verbose(`Parsing dynatrace event`, dimensionMap);

  try {
    const eventStartDate = dimensionMap[serverConfig.dimensionNames.startDate];
    const eventEndDate = dimensionMap[serverConfig.dimensionNames.endDate];
    const duration = (new Date(eventEndDate).getTime() - new Date(eventStartDate).getTime()) / 1000;
    const result = convertConclusionToResult(serverConfig, dimensionMap[serverConfig.dimensionNames.outcome]);

    const repoName = transformRepoNameInbound(
      serverConfig,
      vcsProjectName,
      dimensionMap[serverConfig.dimensionNames.repository],
    );

    const run = <Run>{
      id: dimensionMap[serverConfig.dimensionNames.runId],
      job: dimensionMap[serverConfig.dimensionNames.jobName] || jobName,
      branch: dimensionMap[serverConfig.dimensionNames.branch],
      repo: repoName,
      startDate: eventStartDate,
      duration,
      result,
    };

    verbose(`Parsed dynatrace event to run`, run);
    return run;
  } catch (e) {
    warn(`Failed to parse dynatrace event`, e);
    return null;
  }
};

const convertConclusionToResult = (serverConfig: DynatraceServer, outcome: string): RunResult => {
  return outcome.toString() === serverConfig.successfulOutcomeValue ? RunResult.Succeeded : RunResult.Failed;
};

const transformRepoNameInbound = (config: DynatraceServer, vcsProjectName: string, rawJobName: string): string => {
  if (config.prefixProjectName) {
    if (!vcsProjectName) {
      throw new Error(`Missing project name to prefix job name: ${rawJobName}`);
    }
    if (rawJobName.startsWith(vcsProjectName + "/")) {
      return rawJobName.split("/")[1];
    }
  }
  return rawJobName;
};
