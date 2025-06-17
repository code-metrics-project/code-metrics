import {add} from "date-fns";
import fetch from "node-fetch";
import Bottleneck from "bottleneck";
import {roundTo} from "../../utils/math";
import reject from "lodash/reject";
import sortBy from "lodash/sortBy";
import union from "lodash/union";
import uniq from "lodash/uniq";
import {logResponseBody} from "../../utils/responses";
import {MILLIS_PER_DAY, truncateDateOnly} from "../../utils/date";
import {logger, verbose, warn} from "../../utils/logger/logger";
import {getServerConfig, getWorkloadById} from "../../config/configMapping";
import {CodeAnalysisTypes} from "../../model/config/common";
import {getCodeAnalysisKeysForWorkloadId, RepoCodeAnalysisKey} from "../../utils/repos";
import {ComponentCoverage} from "../../model/codeAnalysis";
import {
  CodeAnalysisService,
  CsvMetricResponse,
  JsonMetricResponse,
  MetricHistoryRecord,
  registerCodeAnalysis,
} from "./codeAnalysisService";
import {getConfig} from "../../config/config";
import {AuthMethod, SonarServer} from "../../model/config/remote-config";
import {Workload, WorkloadId} from "../../model/config/workload-config";

/**
 * Summarise the following metrics by adding an average or total.
 */
const METRIC_SUMMARIES = {
  // simple mean, by date
  mean: [],

  // total, by date
  total: ["ncloc"],

  // weighted by lines_to_cover, by date
  weighted_avg: ["complexity", "coverage"],
};

const NAME_MAP = {
  coverage: "coverage",
  lines_to_cover: "totalLinesToCover",
  ncloc: "totalLines",
};

const limiter = new Bottleneck({
  maxConcurrent: 4,
});

enum ResponseFormat {
  CSV,
  JSON,
}

type SonarMeasureHistoryEntry = {
  date: string;
  value: number;
};

type SonarMeasure = {
  history: SonarMeasureHistoryEntry[];
  metric: string;
};

type CodeAnalysisHistoryResponse = {
  errors?: any[];
  measures: SonarMeasure[];
};

export const initSonar = () => registerCodeAnalysis(CodeAnalysisTypes.SONAR, () => new SonarCodeAnalysisService());

class SonarCodeAnalysisService implements CodeAnalysisService {
  async fetchMetricHistoryAsJson(
    repoGroups: string[],
    workload: Workload,
    metrics: string[],
    startDate: string,
  ): Promise<JsonMetricResponse[]> {
    const results = await fetchMetricHistoryForWorkload(repoGroups, workload, metrics, startDate, ResponseFormat.JSON);
    return results as JsonMetricResponse[];
  }

  async fetchMetricHistoryAsCsv(
    repoGroups: string[],
    workload: Workload,
    metrics: string[],
    startDate: string,
  ): Promise<CsvMetricResponse[]> {
    const results = await fetchMetricHistoryForWorkload(repoGroups, workload, metrics, startDate, ResponseFormat.CSV);
    return results as CsvMetricResponse[];
  }

  async fetchProjectCoverage(
    workloadId: WorkloadId,
    codeAnalysisKey: RepoCodeAnalysisKey,
    requestedSnapshotTimestamp?: number,
  ): Promise<ComponentCoverage> {
    return fetchProjectCoverage(workloadId, codeAnalysisKey, requestedSnapshotTimestamp);
  }

  async fetchRepoGroupCoverage(
    workloadId: WorkloadId,
    repoGroup: string,
    requestedSnapshotTimestamp?: number,
  ): Promise<ComponentCoverage[]> {
    const projectKeys = await getCodeAnalysisKeysForWorkloadId([repoGroup], workloadId);
    if (!projectKeys) return [];
    logger(
      `Fetching SQ metrics for repo group "${repoGroup}" on date ${truncateDateOnly(
        new Date(requestedSnapshotTimestamp),
      )}`,
    );

    return Promise.all(
      projectKeys.map((key) => this.fetchProjectCoverage(workloadId, key, requestedSnapshotTimestamp)),
    );
  }

  async getMetric(workloadId: WorkloadId, metrics: string, projectKey: string, path: string): Promise<any> {
    const component = `${projectKey}:${path}`;
    const componentKey = getComponentKey(workloadId, component);

    const baseUrl = getBaseUrl(workloadId);
    const branch = getBranch(workloadId)
    const url = `${baseUrl}/api/measures/component?branch=${branch}&component=${componentKey}&metricKeys=${metrics}&ps=1000`;
    return fetch(url, getRequestOptions(workloadId))
      .then((res) => res.json())
      .then((response) => logResponseBody(url, response));
  }

  getMetricLink(workloadId: WorkloadId, metricName: string, projectKey: string, path: string): string {
    const baseUrl = getBaseUrl(workloadId);
    const branch = getBranch(workloadId);
    return `${baseUrl}/component_measures?id=${projectKey}&branch=${branch}&metric=${metricName}&selected=${projectKey}:${path}`;
  }

  async getProjectKeysForRepoGroups(repoGroups: string[], workloadId: WorkloadId): Promise<string[]> {
    const sonarTags = repoGroups.flatMap((g) => getSonarTagsByGroup(g, workloadId));
    const sonarProjectKeys: string[] = (
      await Promise.all(
        sonarTags.flatMap(async (sonarTag) => {
          return getProjectKeysForTag(workloadId, sonarTag);
        }),
      )
    ).flat();
    logger(`Matched ${sonarProjectKeys.length} project keys by sonar tag in ${workloadId}`);
    return sonarProjectKeys;
  }
}

/**
 * Find the sonar tags (optionally within a given workload) for
 * a given repository group name.
 *
 * @param groupName
 * @param workloadId
 */
const getSonarTagsByGroup = (groupName: string, workloadId?: WorkloadId): string[] =>
  getConfig()
    .workloadConfigs.workloads.filter((w) => !workloadId || w.id === workloadId)
    .flatMap((w) => w.codeManagement.repoGroups[groupName]?.sonarTags ?? []);

/**
 * TODO cache this
 * @param workloadId
 * @param tagName
 * @param mustHaveTag
 */
const getProjectKeysForTag = async (
  workloadId: WorkloadId,
  tagName: string,
  mustHaveTag?: string,
): Promise<string[]> => {
  const baseUrl = getBaseUrl(workloadId);
  const branch = getBranch(workloadId)
  const url = `${baseUrl}/api/components/search_projects?branch=${branch}&ps=500&filter=tags%3D${tagName}`;
  const projectList: any = await fetch(url, getRequestOptions(workloadId))
    .then((res) => res.json())
    .then((response) => logResponseBody(url, response));

  let projects = projectList?.components;
  if (mustHaveTag) {
    projects = projects.filter((project) => project.tags?.includes(mustHaveTag) ?? false);
  }
  return projects.map((p) => p.key);
};

async function fetchMetricHistoryForWorkload(
  repoGroups: string[],
  workload: Workload,
  metrics: string[],
  startDate: string,
  format: ResponseFormat,
): Promise<JsonMetricResponse[] | CsvMetricResponse[]> {
  const workloadId = workload.id;
  const results: JsonMetricResponse[] | CsvMetricResponse[] = [];

  let rgs: string[];
  if (!repoGroups.length) {
    // assume no filter implies all
    rgs = Object.keys(workload.codeManagement.repoGroups);
  } else {
    rgs = repoGroups;
  }

  for (const repoGroup of rgs) {
    const analysisKeys = await getCodeAnalysisKeysForWorkloadId([repoGroup], workloadId);
    const projectKeys = analysisKeys.map((k) => k.key);
    const tagResult = await getMetricsHistory(workloadId, metrics, projectKeys, startDate);

    switch (format) {
      case ResponseFormat.CSV: {
        const lines = tagResult.map((h) => {
          return <CsvMetricResponse>{ ...h, tag: workloadId + "-" + repoGroup };
        });
        (results as CsvMetricResponse[]).push(...lines);
        break;
      }
      case ResponseFormat.JSON: {
        (results as JsonMetricResponse[]).push(<JsonMetricResponse>{
          workloadId,
          repoGroup,
          raw: tagResult,
        });
        break;
      }
    }
  }
  return results;
}

const fetchProjectCoverage = async (
  workloadId: WorkloadId,
  codeAnalysisKey: RepoCodeAnalysisKey,
  requestedSnapshotTimestamp?: number,
): Promise<ComponentCoverage> => {
  const componentKey = getComponentKey(workloadId, codeAnalysisKey.key);
  logger(
    `Fetching SQ metrics for component "${componentKey}" on date ${truncateDateOnly(
      new Date(requestedSnapshotTimestamp),
    )}`,
  );

  const snapshotTimestamp = requestedSnapshotTimestamp || new Date().getTime();
  const snapshotDate = new Date(snapshotTimestamp);
  const fromDate = truncateDateOnly(new Date(new Date(snapshotDate).getTime() - 31 * MILLIS_PER_DAY));
  const toDate = truncateDateOnly(snapshotDate);

  const baseUrl = getBaseUrl(workloadId);
  const branch = getBranch(workloadId);
  const url = `${baseUrl}/api/measures/search_history?branch=${branch}&component=${componentKey}&metrics=coverage%2Cncloc%2Clines_to_cover&from=${fromDate}&to=${toDate}`;
  const result = await limiter.schedule(() => fetch(url, getRequestOptions(workloadId)));
  const resultJson: { measures: [{ metric; history: [{ date; value }] }]; errors: [] } = await result.json();
  logResponseBody(url, resultJson);

  const analysisLink = getSonarTagLink(workloadId, componentKey);
  const emptyCoverage: ComponentCoverage = {
    analysisKey: codeAnalysisKey,
    analysisLink,
    coverage: 0,
    totalLines: 0,
    totalLinesToCover: 0,
  };

  if (!resultJson.measures) {
    if (resultJson.errors) {
      console.warn(`Could not parse metric history: ${JSON.stringify(resultJson.errors)}`);
    }
    return emptyCoverage;
  }

  const dateFilteredMeasure: { metric: string; value: string }[] = resultJson.measures.map((measure) => {
    const metricValue =
      measure.history.filter((record) => new Date(record.date).getTime() <= snapshotTimestamp).reverse()[0]?.value ||
      "0";
    return {
      metric: measure.metric,
      value: metricValue,
    };
  });
  const coverage: ComponentCoverage = dateFilteredMeasure.reduce((acc, val) => {
    acc[NAME_MAP[val.metric]] = parseFloat(val.value);
    return acc;
  }, emptyCoverage);
  verbose(`Coverage for ${codeAnalysisKey.key}`, coverage);
  return coverage;
};

const mergeMetrics = (a1: any, a2: any, key: string): any => {
  const arr1 = [...a1];
  const arr2 = [...a2];
  return union(
    arr1.map((obj1) => {
      const same = arr2.find((obj2) => obj1[key] === obj2[key]);
      return same ? { ...obj1, ...same } : obj1;
    }),
    reject(arr2, (obj2) => arr1.find((obj1) => obj2[key] === obj1[key])),
  );
};

const mergeMetricsListsByKey = (list: any[][], key: string) => {
  let keyDataMerged = [];
  for (const item of list) {
    keyDataMerged = mergeMetrics(keyDataMerged, item, key);
  }
  return uniq(sortBy(keyDataMerged, ["date"]));
};

const getMetricHistory = async (
  workloadId: WorkloadId,
  metric: string | string[],
  projectName: string,
  path = "",
  startDateStr = "2020-01-01",
): Promise<CodeAnalysisHistoryResponse> => {
  const component = path.length ? `${projectName}%3A${path.replace("/", "%2F")}` : projectName;
  const componentKey = getComponentKey(workloadId, component);
  const metricStr = Array.isArray(metric) ? metric.join("%2C") : metric;
  const startDate = new Date(startDateStr);
  /**
   * SQ is not very smart. When you request history it only returns specifc snapshots of times that
   * the analyser was run, eg. if you request all snapshots starting from 02-01-2022, but the analyser
   * was only run on 01-01-2022 and 03-01-2022, it will return the snapshot on 03-01-2022, but it will
   * not return anything for 02-01-2022, so it will appear blank (ie. 0), rather than assuming that it
   * would still have been the same as the snapshot that was run on 01-01-2022. Hence we request 31 days
   * prior to the request date, and then do that calculation ourselves.
   */
  const preStartDate = truncateDateOnly(add(startDate.getTime(), { days: -31 }));

  const baseUrl = getBaseUrl(workloadId);
  const branch = getBranch(workloadId);
  const url = `${baseUrl}/api/measures/search_history?branch=${branch}&from=${preStartDate}&component=${componentKey}&metrics=${metricStr}&ps=1000`;
  return fetch(url, getRequestOptions(workloadId))
    .then(async (res) => {
      logResponseBody(url, res);
      if (!res.ok) {
        const body = await res.text();
        const errMsg = `Failed to get ${componentKey} metrics: HTTP ${res.status} received - body: ${body}`;
        if (res.status === 404) {
          // the component wasn't found - return an empty body
          warn(errMsg);
          return <CodeAnalysisHistoryResponse>{ measures: [] };
        } else {
          throw new Error(errMsg);
        }
      }
      return res.json();
    })
    .then((response: any) => parseHistoryResponse(response, startDate))
    .catch((reason) => {
      throw new Error(`Failed to retrieve metrics from ${url}: ${reason}`);
    });
};

export const parseHistoryResponse = (response: any, startDate: Date) => {
  const strippedPreDates = response.measures?.map((measure) => {
    const strippedHistory = [];
    for (let i = measure.history.length - 1; i >= 0; i--) {
      const historyEntry = { ...measure.history[i] };
      historyEntry.date = truncateDateOnly(new Date(historyEntry.date));

      if (new Date(historyEntry.date) <= startDate) {
        strippedHistory.push({
          ...historyEntry,
          date: truncateDateOnly(startDate),
        });
        break;
      }
      strippedHistory.push(historyEntry);
    }
    strippedHistory.reverse();
    return {
      ...measure,
      history: strippedHistory,
    };
  });
  return {
    ...response,
    measures: strippedPreDates || [],
  };
};

const getMetricsHistory = async (
  workloadId: WorkloadId,
  metrics: string[],
  projectKeys: string[],
  startDateStr: string,
): Promise<MetricHistoryRecord[]> => {
  if (!projectKeys) return [];

  const queryMetrics = [...metrics];
  const willRequireWeightedAvg = queryMetrics.some((qm) => METRIC_SUMMARIES.weighted_avg.includes(qm));
  if (willRequireWeightedAvg && !queryMetrics.includes("lines_to_cover")) {
    // weighted averages are normalised by lines_to_cover
    queryMetrics.push("lines_to_cover");
  }

  logger(`Fetching '${queryMetrics.join(",")}' metrics for ${projectKeys.length} projects`);

  const metricList: any[] = [];
  for (const key of projectKeys) {
    const metricHistory = await getMetricHistory(workloadId, queryMetrics, key, "", startDateStr);
    const keyDataArr = parseMeasures(metricHistory, key);

    const mergedMetricListForKey = mergeMetricsListsByKey(keyDataArr, "date");
    verbose("mergedMetricListForKey", key, mergedMetricListForKey);
    metricList.push(mergedMetricListForKey);
  }

  // Mega merge all maps by date into single array output
  // logger("metricList pre-merge", metricList.length, metricList);
  let allMetrics = mergeMetricsListsByKey(metricList, "date");

  // Fill date gaps with preceeding value if keys exist
  for (let i = 1; i < allMetrics.length; i++) {
    for (const key of Object.keys(allMetrics[i - 1])) {
      allMetrics[i][key] = allMetrics[i][key] ? allMetrics[i][key] : allMetrics[i - 1][key];
    }
  }

  allMetrics = [...new Map(allMetrics.map((item) => [JSON.stringify(item), item])).values()];

  // Specific to particular use case for graphing
  return allMetrics.map((d: any) => {
    const results: Partial<MetricHistoryRecord> = {
      date: d.date,
    };

    const repos: string[] = uniq(Object.keys(d).map((s) => s.split(":")[0])).filter((s) => s !== "date");
    calculateSummaries(queryMetrics, repos, d, results);

    return results as MetricHistoryRecord;
  });
};

const parseMeasures = (metricHistory: CodeAnalysisHistoryResponse, key: string) => {
  if (!metricHistory.measures) {
    if (metricHistory.errors) {
      console.warn(`Could not parse metric history: ${JSON.stringify(metricHistory.errors)}`);
    }
    return [];
  }
  // TODO: clean this up and generalise
  const keyDataArr = metricHistory.measures.map((measure) =>
    measure.history.map((data) => {
      const date = data.date.replace(/T\d\d:\d\d:\d\d\+0000/, "");

      const value =
        measure.metric === "coverage"
          ? roundTo(data.value / 100, 3)
          : measure.metric.match(/lines/) || measure.metric.match(/loc/)
            ? roundTo(data.value, 0)
            : data.value;

      return {
        date,
        [`${key}:${measure.metric}`]: value,
      };
    }),
  );
  verbose("keyDataArr", key, keyDataArr);
  return keyDataArr;
};

/**
 * Add summaries for metrics, such as totals or averages, based on {@link METRIC_SUMMARIES}.
 * @param metricNames
 * @param repos
 * @param metrics
 * @param results
 */
const calculateSummaries = (
  metricNames: string[],
  repos: string[],
  metrics: Record<string, any>,
  results: Record<string, any>,
) => {
  // calculate means
  for (const metricName of METRIC_SUMMARIES.mean) {
    if (metricNames.includes(metricName)) {
      let metricTotal = 0;
      for (const key of repos) {
        metricTotal += parseFloat(metrics[`${key}:${metricName}`]);
      }
      results[`average_${metricName}`] = roundTo(metricTotal / repos.length, 2);
    }
  }
  // calculate totals
  for (const metricName of METRIC_SUMMARIES.total) {
    if (metricNames.includes(metricName)) {
      let metricTotal = 0;
      for (const key of repos) {
        metricTotal += parseFloat(metrics[`${key}:${metricName}`]);
      }
      results[`total_${metricName}`] = roundTo(metricTotal, 0);
    }
  }
  // calculate weighted averages
  for (const metricName of METRIC_SUMMARIES.weighted_avg) {
    if (metricNames.includes(metricName)) {
      calculateWeightedAverage(metricName, repos, metrics, results);
    }
  }
};

/**
 * Get weighted average for each data point
 * SUMEachRepo(metric * linesToCover) / TotalLinesToCover
 */
const calculateWeightedAverage = (
  metricName: string,
  repos: string[],
  metrics: Record<string, any>,
  results: Record<string, any>,
) => {
  let weightedSum = 0;
  let totalDataPointLines = 0;
  for (const key of repos) {
    weightedSum += (metrics[`${key}:lines_to_cover`] as number) * (metrics[`${key}:${metricName}`] as number);
    totalDataPointLines += parseFloat(metrics[`${key}:lines_to_cover`]);
  }
  results[`average_${metricName}`] = roundTo(weightedSum / totalDataPointLines, 3);
  results.total_lines_to_cover = roundTo(totalDataPointLines, 0);
  Object.keys(metrics)
    .filter((key) => key.match(new RegExp(`:${metricName}`)))
    .forEach((key) => (results[key] = metrics[key]));
};

const getSonarTagLink = (workloadId: WorkloadId, componentKey: string): string => {
  const baseUrl = getBaseUrl(workloadId);
  const branch = getBranch(workloadId);
  return `${baseUrl}/component_measures?branch=${branch}&metric=coverage&view=list&id=${componentKey}`;
};

const getSonarServer = (serverId: string): SonarServer =>
  getServerConfig(getConfig().remoteConfigs.codeAnalysis.sonar?.servers, serverId);

/**
 * @param workloadId
 * @param name
 * @return the component key, based on the project name and, if set, the component key prefix
 */
export const getComponentKey = (workloadId: string, name: string) => {
  const workload = getWorkloadById(workloadId);
  const server = getSonarServer(workload.codeAnalysis.serverId);

  const componentKeyPrefix = workload.codeAnalysis.componentKeyPrefix
    ? workload.codeAnalysis.componentKeyPrefix
    : server.componentKeyPrefix
      ? server.componentKeyPrefix
      : "";

  return componentKeyPrefix ? componentKeyPrefix + name : name;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getTagsForProjectKey = async (workloadId: WorkloadId, projectName: string): Promise<string[]> => {
  const componentKey = getComponentKey(workloadId, projectName);

  const baseUrl = getBaseUrl(workloadId);
  const branch = getBranch(workloadId);
  const projectInfo: any = await fetch(
    `${baseUrl}/api/components/show?branch=${branch}&component=${componentKey}`,
    getRequestOptions(workloadId),
  ).then((res) => res.json());

  // eslint-disable-next-line no-unsafe-optional-chaining
  return [...projectInfo.component?.tags];
};

const getBaseUrl = (workloadId: WorkloadId): string =>
  getSonarServer(getWorkloadById(workloadId).codeAnalysis.serverId).url;

const getBranch = (workloadId: WorkloadId): string =>
  getWorkloadById(workloadId).codeAnalysis.branch ?? 'main';

const getRequestOptions = (workloadId: WorkloadId) => {
  const workload = getWorkloadById(workloadId);
  const server = getSonarServer(workload.codeAnalysis.serverId);

  // note trailing colon after key, since this is the basic auth scheme
  if (server.authMethod == AuthMethod.BEARER_TOKEN) {
    return {
      headers: {
        Authorization: `Bearer ${server.apiKey}`,
      },
    };
  }

  const encodedAuth = Buffer.from(`${server.apiKey}:`).toString("base64");
  return {
    headers: {
      Authorization: `Basic ${encodedAuth}`,
    },
  };
};
