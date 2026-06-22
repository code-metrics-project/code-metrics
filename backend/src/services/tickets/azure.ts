import { getPersonalAccessTokenHandler, WebApi } from "azure-devops-node-api/WebApi";
import { IWorkItemTrackingApi } from "azure-devops-node-api/WorkItemTrackingApi";
import { WorkItem, WorkItemQueryResult } from "azure-devops-node-api/interfaces/WorkItemTrackingInterfaces";
import { Datastore, DatastoreCollection } from "../../db/api";
import { getAllIssueManagementUrls, getWorkloadById } from "../../config/configMapping";
import { TicketConfigManager, TicketService, TimeRangeMode } from "./ticketService";
import { LightweightIssue } from "../../model/tickets";
import { logger, verbose } from "../../utils/logger/logger";
import { provideDatastore } from "../../db/factory";
import { limitConcurrencyAndRetry } from "../../utils/retry";
import { AzureTicketOptions, TicketManagementTypes } from "../../model/config/common";
import { truncateDateOnly } from "../../utils/date";
import { Workload, WorkloadId, WorkloadTicketConfigAzure } from "../../model/config/workload-config";
import Bottleneck from "bottleneck";
import { getEnvConfigItemAsNumber } from "../../config/sources/source";

const MAX_RESULTS_PER_QUERY = 200;
const EXPIRY_SECONDS = getEnvConfigItemAsNumber("EXPIRY_SECONDS", 3600);
const ISSUE_PATTERN = /(?<!#)\d+/;

// Azure DevOps WIQL has a hard limit of 20,000 work items per query
const WIQL_RESULT_LIMIT = 20000;
// Minimum date range before we stop splitting (1 day in milliseconds)
const MIN_DATE_RANGE_MS = 24 * 60 * 60 * 1000;
// Proactively split ranges larger than this many days to avoid hitting 20k limit
// Based on typical bug creation rates, 30 days is usually safe
const MAX_DAYS_PER_QUERY = 30;
const MAX_QUERY_RANGE_MS = MAX_DAYS_PER_QUERY * MIN_DATE_RANGE_MS;

/**
 * Result of a fetch operation - tracks success/failure to avoid caching errors
 */
type FetchResult = {
  success: boolean;
  issues: LightweightIssue[];
  error?: string;
};

const limiter = new Bottleneck({
  maxConcurrent: 4,
});

type AdoConfigManager = TicketConfigManager<WorkloadTicketConfigAzure, AzureTicketOptions>;

/**
 * Cache entry for storing issues by individual day
 */
type CachedIssues = {
  workloadId: string;
  date: string; // Date in YYYY-MM-DD format
  queryType: string; // 'new' | 'open' | 'resolved'
  priority: string;
  issueTypes: string;
  issues: LightweightIssue[];
};

export class AdoTicketService implements TicketService {
  private configManager: AdoConfigManager;
  private cache: Datastore<{ workload: string; key: string }, DatastoreCollection>;
  private issueCache: Datastore<CachedIssues, DatastoreCollection>;
  private connections: Map<string, WebApi>;

  constructor(configManager: AdoConfigManager) {
    this.configManager = configManager;
    this.cache = provideDatastore("ado-issues", {
      expireAfterSeconds: EXPIRY_SECONDS,
    });
    // Cache for date-walked issue results - never expires since we only cache past days
    // and historical data (created/resolved dates) is immutable
    this.issueCache = provideDatastore("ado-issues-by-date", {});
    this.connections = new Map<string, WebApi>();
  }

  getConnection = (workloadId: WorkloadId, reset = false): WebApi => {
    let connection: WebApi;
    if (!this.connections.has(workloadId) || reset) {
      const azureServer = this.configManager.getServerConfig(TicketManagementTypes.AZURE, workloadId);

      const authHandler = getPersonalAccessTokenHandler(azureServer.apiKey);
      connection = new WebApi(azureServer.url, authHandler);
      this.connections.set(workloadId, connection);
    } else {
      connection = this.connections.get(workloadId);
    }

    return connection;
  };

  /**
   * Fetches tickets using date-walking to handle large date ranges.
   * Breaks up queries into weekly chunks to stay under the 20,000 result limit,
   * caches results by date chunk for efficient re-fetching.
   */
  async fetchTickets(
    workloadId: string,
    startDate: Date,
    endDate: Date | null,
    priority: string,
    timeRangeMode: TimeRangeMode,
  ): Promise<LightweightIssue[]> {
    const workload = getWorkloadById(workloadId);
    const issueTypes = this.getTicketTypesByWorkloadId(workload.id);
    const queryType = timeRangeMode === TimeRangeMode.CreatedWithinRange ? "new" : "resolved";

    // Default endDate to now if not provided
    const effectiveEndDate = endDate ?? new Date();

    return this.fetchIssuesWithDateWalking(
      workload,
      startDate,
      effectiveEndDate,
      priority,
      issueTypes,
      queryType,
      (chunkStart, chunkEnd) => this.buildTicketsWiql(issueTypes, priority, chunkStart, chunkEnd, timeRangeMode),
    );
  }

  /**
   * Builds WIQL for a single date chunk.
   * Uses YYYY-MM-DD format which Azure DevOps WIQL prefers.
   */
  private buildTicketsWiql(
    issueTypes: string[],
    priority: string,
    startDate: Date,
    endDate: Date,
    timeRangeMode: TimeRangeMode,
  ): string {
    const issueTypeClause = `Where [System.WorkItemType] IN (${this.formatIssueTypes(issueTypes)})`;
    const priorityClause = priority ? `AND [Microsoft.VSTS.Common.Priority] >= ${this.mapPriority(priority)}` : "";
    const dateFieldName =
      timeRangeMode === TimeRangeMode.CreatedWithinRange
        ? "[System.CreatedDate]"
        : "[Microsoft.VSTS.Common.ResolvedDate]";
    const dateClause = `AND ${dateFieldName} >= '${this.formatWiqlDate(startDate)}' AND ${dateFieldName} < '${this.formatWiqlDate(endDate)}'`;

    return `From WorkItems ${issueTypeClause} ${priorityClause} ${dateClause}`;
  }

  /**
   * Formats a date for WIQL queries. Azure DevOps prefers YYYY-MM-DD format.
   */
  private formatWiqlDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Fetches open tickets using date-walking for large date ranges.
   */
  fetchOpenTickets = async (
    workloadId: WorkloadId,
    startDate: Date,
    endDate: Date,
    priority: string,
  ): Promise<LightweightIssue[]> => {
    const workload = getWorkloadById(workloadId);
    const issueTypes = this.getTicketTypesByWorkloadId(workload.id);

    return this.fetchIssuesWithDateWalking(
      workload,
      startDate,
      endDate,
      priority,
      issueTypes,
      "open",
      (chunkStart, chunkEnd) => this.buildOpenTicketsWiql(issueTypes, priority, chunkStart, chunkEnd),
    );
  };

  /**
   * Builds WIQL for open tickets in a single date chunk
   */
  private buildOpenTicketsWiql(issueTypes: string[], priority: string, startDate: Date, endDate: Date): string {
    const issueTypeClause = `Where [System.WorkItemType] IN (${this.formatIssueTypes(issueTypes)})`;
    const priorityClause = priority ? `AND [Microsoft.VSTS.Common.Priority] >= ${this.mapPriority(priority)}` : "";
    // Open bugs: created within the date range AND either still unresolved OR resolved after start date
    const startDateStr = this.formatWiqlDate(startDate);
    const endDateStr = this.formatWiqlDate(endDate);
    const dateClause = `AND ([System.CreatedDate] >= '${startDateStr}' AND [System.CreatedDate] < '${endDateStr}') AND ([System.State] NOT IN ('Closed', 'Resolved', 'Done') OR [Microsoft.VSTS.Common.ResolvedDate] >= '${startDateStr}')`;

    return `From WorkItems ${issueTypeClause} ${priorityClause} ${dateClause}`;
  }

  /**
   * Daily-cached fetching with divide-and-conquer for large result sets.
   *
   * Strategy:
   * 1. Walk day-by-day, checking cache for each day
   * 2. Collect consecutive uncached days into "fetch ranges"
   * 3. For each fetch range, use divide-and-conquer if it hits the 20k limit
   * 4. Cache results by individual day for maximum reuse
   *
   * This ensures overlapping date queries benefit from cached daily data.
   * E.g., a 30-day query followed by a 60-day query will reuse the first 30 days.
   */
  private async fetchIssuesWithDateWalking(
    workload: Workload,
    startDate: Date,
    endDate: Date,
    priority: string,
    issueTypes: string[],
    queryType: string,
    wiqlBuilder: (chunkStart: Date, chunkEnd: Date) => string,
  ): Promise<LightweightIssue[]> {
    const issueTypesKey = issueTypes.join(",");
    const allIssues: LightweightIssue[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Collect days that need fetching
    const uncachedRanges: Array<{ start: Date; end: Date }> = [];
    let rangeStart: Date | null = null;
    let currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    const endDateNormalized = new Date(endDate);
    endDateNormalized.setHours(0, 0, 0, 0);

    logger(
      `[ADO Cache] Checking cache for ${workload.id} from ${truncateDateOnly(startDate)} to ${truncateDateOnly(endDate)}`,
    );

    let cacheHits = 0;
    let cacheMisses = 0;

    // Walk day by day
    while (currentDate < endDateNormalized) {
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Only check cache for past days (not today or future)
      const isPastDay = currentDate < today;

      if (isPastDay) {
        const cached = await this.getDayFromCache(workload.id, queryType, priority, issueTypesKey, currentDate);

        if (cached !== null) {
          cacheHits++;
          // Found in cache - close any open range and add cached issues
          if (rangeStart !== null) {
            uncachedRanges.push({ start: rangeStart, end: currentDate });
            rangeStart = null;
          }
          allIssues.push(...cached);
          verbose(`[ADO Cache] Hit for ${truncateDateOnly(currentDate)}: ${cached.length} items`);
        } else {
          cacheMisses++;
          // Not in cache - start or extend uncached range
          if (rangeStart === null) {
            rangeStart = new Date(currentDate);
          }
        }
      } else {
        // Current or future day - always fetch (don't cache)
        if (rangeStart === null) {
          rangeStart = new Date(currentDate);
        }
      }

      currentDate = nextDay;
    }

    logger(`[ADO Cache] Summary: ${cacheHits} cache hits, ${cacheMisses} cache misses`);

    // Close final range if open
    if (rangeStart !== null) {
      uncachedRanges.push({ start: rangeStart, end: endDateNormalized });
    }

    logger(`[ADO Cache] Uncached ranges to fetch: ${uncachedRanges.length}`);
    for (const r of uncachedRanges) {
      logger(`[ADO Cache]   Range: ${truncateDateOnly(r.start)} to ${truncateDateOnly(r.end)}`);
    }

    // Fetch uncached ranges - track errors
    let fetchedCount = 0;
    const errors: string[] = [];

    for (const range of uncachedRanges) {
      logger(`[ADO Cache] Fetching uncached range: ${truncateDateOnly(range.start)} to ${truncateDateOnly(range.end)}`);

      const result = await this.fetchRangeWithDivideAndConquer(
        workload,
        range.start,
        range.end,
        priority,
        issueTypesKey,
        queryType,
        wiqlBuilder,
      );

      if (result.success) {
        logger(
          `[ADO Cache] Fetched ${result.issues.length} issues for range ${truncateDateOnly(range.start)} to ${truncateDateOnly(range.end)}`,
        );
        fetchedCount += result.issues.length;

        // Only cache on successful fetch
        await this.cacheIssuesByDay(
          workload.id,
          queryType,
          priority,
          issueTypesKey,
          range.start,
          range.end,
          result.issues,
          today,
        );

        allIssues.push(...result.issues);
      } else {
        // Don't cache failed ranges - log error prominently
        const errorMsg = `FAILED to fetch ${truncateDateOnly(range.start)} to ${truncateDateOnly(range.end)}: ${result.error}`;
        logger(`[ADO Cache] ERROR: ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    if (errors.length > 0) {
      logger(
        `[ADO Cache] WARNING: ${errors.length} range(s) failed to fetch. These dates were NOT cached and will be retried on next request.`,
      );
      for (const e of errors) {
        logger(`[ADO Cache]   - ${e}`);
      }
    }

    logger(
      `[ADO Cache] Total: ${allIssues.length} issues (${fetchedCount} fetched, ${allIssues.length - fetchedCount} from cache, ${errors.length} errors)`,
    );
    return allIssues;
  }

  /**
   * Fetch a date range, using divide-and-conquer if we hit the 20k limit.
   * Returns a FetchResult to track success/failure - failed fetches should NOT be cached.
   *
   * Proactively splits large date ranges to avoid hitting the 20k limit.
   */
  private async fetchRangeWithDivideAndConquer(
    workload: Workload,
    startDate: Date,
    endDate: Date,
    priority: string,
    issueTypesKey: string,
    queryType: string,
    wiqlBuilder: (chunkStart: Date, chunkEnd: Date) => string,
  ): Promise<FetchResult> {
    const dateRangeMs = endDate.getTime() - startDate.getTime();

    // Proactively split large date ranges to avoid hitting 20k limit
    if (dateRangeMs > MAX_QUERY_RANGE_MS) {
      const numChunks = Math.ceil(dateRangeMs / MAX_QUERY_RANGE_MS);
      logger(
        `[ADO] Proactively splitting ${truncateDateOnly(startDate)} to ${truncateDateOnly(endDate)} into ${numChunks} chunks of ~${MAX_DAYS_PER_QUERY} days`,
      );

      const allIssues: LightweightIssue[] = [];
      const errors: string[] = [];
      let currentStart = new Date(startDate);

      while (currentStart < endDate) {
        const chunkEnd = new Date(Math.min(currentStart.getTime() + MAX_QUERY_RANGE_MS, endDate.getTime()));

        const result = await this.fetchSingleRange(
          workload,
          currentStart,
          chunkEnd,
          priority,
          issueTypesKey,
          queryType,
          wiqlBuilder,
        );

        if (result.success) {
          allIssues.push(...result.issues);
        } else {
          errors.push(
            result.error || `Failed chunk ${truncateDateOnly(currentStart)} to ${truncateDateOnly(chunkEnd)}`,
          );
        }

        currentStart = chunkEnd;
      }

      if (errors.length > 0) {
        return { success: false, issues: allIssues, error: errors.join("; ") };
      }
      return { success: true, issues: allIssues };
    }

    // Range is small enough - try to fetch directly
    return this.fetchSingleRange(workload, startDate, endDate, priority, issueTypesKey, queryType, wiqlBuilder);
  }

  /**
   * Fetch a single date range. If it hits 20k error, recursively splits.
   */
  private async fetchSingleRange(
    workload: Workload,
    startDate: Date,
    endDate: Date,
    priority: string,
    issueTypesKey: string,
    queryType: string,
    wiqlBuilder: (chunkStart: Date, chunkEnd: Date) => string,
  ): Promise<FetchResult> {
    const dateRangeMs = endDate.getTime() - startDate.getTime();
    const wiql = wiqlBuilder(startDate, endDate);

    try {
      const issues = await this.fetchIssues(workload, wiql);
      logger(
        `[ADO] Retrieved ${issues.length} items for ${truncateDateOnly(startDate)} to ${truncateDateOnly(endDate)}`,
      );

      // Check if we hit the 20,000 limit (shouldn't happen often with proactive splitting)
      if (issues.length >= WIQL_RESULT_LIMIT) {
        if (dateRangeMs <= MIN_DATE_RANGE_MS) {
          logger(`[ADO] WARNING: Hit ${WIQL_RESULT_LIMIT} limit on single day ${truncateDateOnly(startDate)}`);
          return { success: true, issues };
        }

        // Split the date range in half and fetch each half
        const midDate = new Date(startDate.getTime() + dateRangeMs / 2);
        logger(`[ADO] Hit ${WIQL_RESULT_LIMIT} limit, splitting at ${truncateDateOnly(midDate)}`);

        const [firstResult, secondResult] = await Promise.all([
          this.fetchSingleRange(workload, startDate, midDate, priority, issueTypesKey, queryType, wiqlBuilder),
          this.fetchSingleRange(workload, midDate, endDate, priority, issueTypesKey, queryType, wiqlBuilder),
        ]);

        // If either half failed, propagate the failure
        if (!firstResult.success || !secondResult.success) {
          const errorParts: string[] = [];
          if (!firstResult.success) errorParts.push(firstResult.error || "First half failed");
          if (!secondResult.success) errorParts.push(secondResult.error || "Second half failed");
          return { success: false, issues: [], error: errorParts.join("; ") };
        }

        return { success: true, issues: [...firstResult.issues, ...secondResult.issues] };
      }

      return { success: true, issues };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Check if this is the "too many results" error - if so, split and retry
      if (errorMsg.includes("VS402337") || errorMsg.includes("exceeds the size limit")) {
        logger(
          `[ADO] Query exceeded 20k limit for ${truncateDateOnly(startDate)} to ${truncateDateOnly(endDate)}, splitting...`,
        );

        // Can we split further?
        if (dateRangeMs <= MIN_DATE_RANGE_MS) {
          logger(`[ADO] ERROR: Cannot split further - single day ${truncateDateOnly(startDate)} has >20k items!`);
          return { success: false, issues: [], error: `Single day ${truncateDateOnly(startDate)} exceeds 20k limit` };
        }

        // Split the date range in half and fetch each half
        const midDate = new Date(startDate.getTime() + dateRangeMs / 2);
        logger(`[ADO] Splitting at ${truncateDateOnly(midDate)} due to 20k error`);

        const [firstResult, secondResult] = await Promise.all([
          this.fetchSingleRange(workload, startDate, midDate, priority, issueTypesKey, queryType, wiqlBuilder),
          this.fetchSingleRange(workload, midDate, endDate, priority, issueTypesKey, queryType, wiqlBuilder),
        ]);

        // If either half failed, propagate the failure
        if (!firstResult.success || !secondResult.success) {
          const errorParts: string[] = [];
          if (!firstResult.success) errorParts.push(firstResult.error || "First half failed");
          if (!secondResult.success) errorParts.push(secondResult.error || "Second half failed");
          return { success: false, issues: [], error: errorParts.join("; ") };
        }

        return { success: true, issues: [...firstResult.issues, ...secondResult.issues] };
      }

      // Other errors - log and fail
      logger(`[ADO] Error fetching ${truncateDateOnly(startDate)} to ${truncateDateOnly(endDate)}: ${errorMsg}`);
      return { success: false, issues: [], error: errorMsg };
    }
  }

  /**
   * Cache issues by individual day for maximum cache reuse.
   */
  private async cacheIssuesByDay(
    workloadId: string,
    queryType: string,
    priority: string,
    issueTypesKey: string,
    startDate: Date,
    endDate: Date,
    issues: LightweightIssue[],
    today: Date,
  ): Promise<void> {
    // Group issues by their relevant date (created or resolved depending on queryType)
    const issuesByDay = new Map<string, LightweightIssue[]>();

    // Initialize all days in range with empty arrays
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = truncateDateOnly(d);
      issuesByDay.set(dateKey, []);
    }

    // Assign issues to their respective days
    for (const issue of issues) {
      const issueDate =
        queryType === "new" || queryType === "open"
          ? new Date(issue.created)
          : issue.resolutiondate
            ? new Date(issue.resolutiondate)
            : null;

      if (issueDate) {
        const dateKey = truncateDateOnly(issueDate);
        const dayIssues = issuesByDay.get(dateKey);
        if (dayIssues) {
          dayIssues.push(issue);
        }
      }
    }

    // Cache each day (only past days)
    for (const [dateKey, dayIssues] of issuesByDay.entries()) {
      const dayDate = new Date(dateKey);
      if (dayDate < today) {
        await this.saveDayToCache(workloadId, queryType, priority, issueTypesKey, dayDate, dayIssues);
      }
    }
  }

  /**
   * Get cached issues for a single day
   */
  private async getDayFromCache(
    workloadId: string,
    queryType: string,
    priority: string,
    issueTypesKey: string,
    date: Date,
  ): Promise<LightweightIssue[] | null> {
    try {
      const cached = await this.issueCache.connect("ado-issues-by-date", async (col) => {
        return await col.findOne({
          workloadId,
          queryType,
          priority: priority || "all",
          issueTypes: issueTypesKey,
          date: truncateDateOnly(date),
        });
      });

      if (cached) {
        return cached.issues as LightweightIssue[];
      }
    } catch {
      // Cache miss is normal
    }
    return null;
  }

  /**
   * Save issues to cache for a single day
   */
  private async saveDayToCache(
    workloadId: string,
    queryType: string,
    priority: string,
    issueTypesKey: string,
    date: Date,
    issues: LightweightIssue[],
  ): Promise<void> {
    try {
      const dateKey = truncateDateOnly(date);
      const entry = {
        workloadId,
        date: dateKey,
        queryType,
        priority: priority || "all",
        issueTypes: issueTypesKey,
        issues,
      };
      await this.issueCache.connect("ado-issues-by-date", async (col) => {
        return await col.insertOne(
          { workloadId, queryType, priority: priority || "all", issueTypes: issueTypesKey, date: dateKey },
          entry,
        );
      });
      verbose(`[ADO Cache] Saved ${issues.length} issues for ${workloadId} on ${dateKey}`);
    } catch (err) {
      verbose(`[ADO Cache] Failed to save cache for ${truncateDateOnly(date)}: ${err}`);
    }
  }

  getAllTicketIds = (workload: Workload, daysBack: number, issueTypes?: string[]): Promise<string[]> => {
    const effectiveIssueTypes = issueTypes?.length ? issueTypes : this.getTicketTypesByWorkloadId(workload.id);
    const formattedIssueTypes = this.formatIssueTypes(effectiveIssueTypes);
    const query = `From WorkItems Where [System.WorkItemType] IN (${formattedIssueTypes}) AND [System.CreatedDate] >= @today-${daysBack}`;
    return this.fetchAllIssuesAndMap(query, workload.id, ["System.Id"], ({ id }) => id);
  };

  formatIssueTypes = (issueTypes: string[]): string => `'${issueTypes.join("','")}'`;

  getTicket = async (workloadId: WorkloadId, issueId: string): Promise<LightweightIssue | null> =>
    this.fetchMappedIssuesDetails([issueId as unknown as number], workloadId)[0];

  /**
   * Fetches work item references matching the WIQL query.
   * Note: WIQL queries return work item IDs only (not full objects) and have a built-in
   * limit of 20,000 items. The API returns all matching IDs in a single call.
   *
   * @param rawWiql the query to execute
   * @param workloadId for the ado connection
   * @param fields - limit to improve performance
   *
   * https://{{coreServer}}/{{organization}}/{{project}}/{{team}}/_apis/wit/wiql?api-version={{api-version}}&$top=100
   */

  fetchAllIssueRefsViaAPI = async (rawWiql: string, workloadId: string, _fields: string[] = []) => {
    const serverConfig = this.configManager.getServerConfig(TicketManagementTypes.AZURE, workloadId);
    const wiql = serverConfig.filter ? `${rawWiql} ${serverConfig.filter}` : rawWiql;
    const ticketManagement = this.configManager.getWorkloadConfig(workloadId);
    const issueApi: IWorkItemTrackingApi = await this.getConnection(workloadId).getWorkItemTrackingApi();

    // WIQL Select statement - for queryByWiql we only need [System.Id]
    const query = `Select [System.Id] ${wiql}`;
    logger(`[ADO] Querying project "${ticketManagement.projectName}" with WIQL: ${query}`);

    try {
      const queryRes: WorkItemQueryResult = await limitConcurrencyAndRetry(limiter, async () =>
        issueApi.queryByWiql({ query }, { project: ticketManagement.projectName, team: ticketManagement.team }, true),
      );

      if (!queryRes?.workItems?.length) {
        logger(`[ADO] No work items returned from query`);
        return [];
      }

      logger(`[ADO] ${queryRes.workItems.length} work item IDs retrieved`);
      return queryRes.workItems;
    } catch (err) {
      logger(`[ADO] Error querying work items: ${err}`);
      throw err;
    }
  };

  /**
   * Returns the detailed information for a batch of ADO work items
   * @param issueIds ado work item issue ids as array - max 200 per call
   * @param workloadId for the ado connection
   * @param fields limit response for performance
   * @returns raw ado work item objects
   */
  fetchIssuesDetailsViaAPI = async (issueIds: number[], workloadId: WorkloadId, fields: string[] = []) => {
    const issueApi: IWorkItemTrackingApi = await this.getConnection(workloadId).getWorkItemTrackingApi();
    const workItemRes: WorkItem[] = [];
    for (let i = 0; i < issueIds.length; i += MAX_RESULTS_PER_QUERY) {
      const idBatch = issueIds.slice(i, i + MAX_RESULTS_PER_QUERY);
      const workItemBatch = await limitConcurrencyAndRetry(limiter, async () => issueApi.getWorkItems(idBatch, fields));
      if (workItemBatch) workItemRes.push(...workItemBatch);
    }
    return workItemRes || [];
  };

  fetchMappedIssuesDetails = async (issueIds: number[], workloadId: WorkloadId, fields: string[] = []) =>
    (await this.fetchIssuesDetailsViaAPI(issueIds, workloadId, fields)).map((wi) =>
      this.mapLightweightIssue(wi, workloadId),
    );

  fetchIssues = async (workload: Workload, wiql: string): Promise<LightweightIssue[]> => {
    const issues: LightweightIssue[] = [];
    const workloadIssues = await this.fetchAllIssuesAndMap<LightweightIssue>(
      wiql,
      workload.id,
      [
        "System.Id",
        "System.Title",
        "System.State",
        "System.WorkItemType",
        "System.CreatedDate",
        "Microsoft.VSTS.Common.ResolvedDate",
        "Microsoft.VSTS.Common.Priority",
      ],
      (issue) => {
        return this.mapLightweightIssue(issue, workload.id);
      },
    );
    issues.push(...workloadIssues);
    return issues;
  };

  fetchAllIssuesAndMap = async <T>(
    wiql: string,
    workloadId: string,
    fields: string[],
    mapFn: (issue) => T,
  ): Promise<T[]> => {
    logger(`Fetching Work Item issues from workload ${workloadId}...`);
    try {
      const allIssuesRefs = await this.fetchAllIssueRefsViaAPI(
        wiql,
        workloadId,
        fields.map((f) => `[${f}]`),
      );
      logger(`${allIssuesRefs.length} total Work Items retrieved`);
      const allIssuesDetails = await this.fetchIssuesDetailsViaAPI(
        allIssuesRefs.map((i) => i.id),
        workloadId,
        fields,
      );
      return allIssuesDetails.map(mapFn);
    } catch (err) {
      throw new Error(`Azure DevOps error with WIQL: ${wiql} - error: ${err}`);
    }
  };

  getTicketTypesByWorkloadId = (workloadId: WorkloadId): string[] => {
    const ticketManagement = this.configManager.getWorkloadConfig(workloadId);
    const serverDefaults = this.configManager.getServerDefaults(workloadId);

    if (ticketManagement?.ticketTypes) {
      return ticketManagement.ticketTypes;
    } else if (serverDefaults?.ticketTypes) {
      return serverDefaults.ticketTypes;
    } else {
      return this.configManager.getDefaultTicketTypes();
    }
  };

  getAvailableIssueTypes = (workloadId: WorkloadId): string[] => {
    return this.getTicketTypesByWorkloadId(workloadId);
  };

  mapLightweightIssue = (issue: WorkItem, workloadId: string): LightweightIssue => {
    return {
      key: `${issue.id}`,
      issueType: issue.fields["System.WorkItemType"],
      created: issue.fields["System.CreatedDate"],
      resolutiondate: issue.fields["Microsoft.VSTS.Common.ResolvedDate"],
      priority: issue.fields["Microsoft.VSTS.Common.Priority"],
      title: issue.fields["System.Title"],
      workload: workloadId,
    };
  };

  mapPriority = (priorityStr: string): number => {
    switch (priorityStr) {
      case "Lowest":
        return 0;
      case "Low":
        return 1;
      case "Medium":
        return 2;
      case "High":
        return 3;
      case "Highest":
        return 4;
      default:
        return -1;
    }
  };

  matchTicketByIdAndRetrieve = async (
    message: string | null,
    workloadId: WorkloadId,
  ): Promise<LightweightIssue | null> => {
    const issueId = this.matchTicketId(message);
    if (!issueId) {
      return null;
    }
    const issue = await this.getTicket(workloadId, issueId);
    if (issue) {
      return issue;
    } else {
      verbose(`Failed to retrieve ${issueId} - assuming invalid issue`);
      return null;
    }
  };

  matchTicketId(message: string): string | null {
    const matcher: RegExpMatchArray = message?.match(ISSUE_PATTERN);
    return matcher ? matcher[0] : null;
  }

  buildTicketLink = (workloadId: WorkloadId, issueId: string): string => {
    const ticketManagement = this.configManager.getWorkloadConfig(workloadId);
    return `${getAllIssueManagementUrls()[workloadId]}/${ticketManagement.projectName}/_workitems/edit/${issueId}`;
  };
}
