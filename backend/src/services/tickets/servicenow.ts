import { limitConcurrency } from "../../utils/retry";
import { logResponseBody } from "../../utils/responses";
import { getAllIssueManagementUrls, getWorkloadById } from "../../config/configMapping";
import { ServiceNowTicketOptions, TicketManagementTypes } from "../../model/config/common";
import { logger, verbose, warn } from "../../utils/logger/logger";
import { TicketConfigManager, TicketService, TimeRangeMode } from "./ticketService";
import { LightweightIssue } from "../../model/tickets";
import { provideDatastore } from "../../db/factory";
import { Datastore, DatastoreCollection } from "../../db/api";
import { truncateDateOnly } from "../../utils/date";
import { AuthMethod, ServiceNowServer } from "../../model/config/remote-config";
import { Workload, WorkloadId, WorkloadTicketConfigServiceNow } from "../../model/config/workload-config";
import Bottleneck from "bottleneck";
import { buildServerAuth, ServerAuth } from "../../utils/serverAuth";
import { getEnvConfigItemAsNumber } from "../../config/sources/source";

type ServiceNowTicket = {
  number: string;
  sys_created_on: string;
  state: string;
  closed_at: string;
  sys_id: string;
  short_description: string;
  severity: string;
};

type ServiceNowResponse = {
  result?: ServiceNowTicket[];
  error?: {
    message: string;
    detail: string;
  };
};

type ServiceNowQueryArg = {
  key: string;
  value: string;
  operator: "<" | "=" | ">";
};

type ServiceNowQuery = {
  tableName: string;
  fields: (keyof ServiceNowTicket)[];

  /**
   * Will be transformed into sysparm_query
   */
  query: ServiceNowQueryArg[];

  /**
   * Will be appended to the sysparm_query.
   */
  additionalQuery?: string;

  /**
   * Limit the number of results per query.
   * If not set, `MAX_RESULTS_PER_QUERY` will be used.
   */
  limit?: number;
};

const MAX_RESULTS_PER_QUERY = 100;
const EXPIRY_SECONDS = getEnvConfigItemAsNumber("EXPIRY_SECONDS", 3600);
const COLLECTION_NAME_ISSUES = "issues";

const COMMON_FIELDS: (keyof ServiceNowTicket)[] = [
  "number",
  "short_description",
  "sys_created_on",
  "closed_at",
  "severity",
  "state",
];

const limiter = new Bottleneck({
  maxConcurrent: 4,
});

/**
 * e.g. INC00000123
 */
const TICKET_NUMBER_PATTERN = /INC\d{1,10}/;

class ServiceNowClient {
  private readonly server: ServiceNowServer;
  private readonly auth: ServerAuth;

  constructor(server: ServiceNowServer) {
    this.server = server;
    this.auth = buildServerAuth("ticketManagement", "servicenow", server);
  }

  async listTickets(query: ServiceNowQuery): Promise<ServiceNowTicket[]> {
    logger(`Querying ServiceNow ${this.server.id} with query`, query);

    const composedQuery = this.composeQuery(query);
    const limit = query.limit ?? MAX_RESULTS_PER_QUERY;
    const options = await this.getRequestOptions();

    const allIssues: ServiceNowTicket[] = [];
    let lastResultCount = -1;
    let page = 0;
    do {
      page++;
      const url =
        `${this.server.url}/api/now/table/${query.tableName}` +
        `?sysparm_limit=${limit}` +
        `&sysparm_offset=${allIssues.length}` +
        `&sysparm_fields=${query.fields.join(",")}` +
        `&sysparm_query=${composedQuery}`;

      verbose(`ServiceNow URL for page ${page}`, url);

      const response: ServiceNowResponse = await limitConcurrency(limiter, async () =>
        fetch(url, options)
          .then((res) => res.json())
          .then((response) => logResponseBody(url, response)),
      );
      if (response.error) {
        throw new Error(`Failed to query ServiceNow with query: ${query} - error: ${JSON.stringify(response.error)}`);
      }

      lastResultCount = response.result?.length ?? 0;
      logger(`${lastResultCount} ServiceNow tickets retrieved for page ${page}`);
      if (lastResultCount > 0) {
        allIssues.push(...response.result);
      }
    } while (lastResultCount > 0);

    logger(`${allIssues.length} total ServiceNow tickets retrieved`);
    return allIssues;
  }

  private composeQuery(query: ServiceNowQuery): string {
    let composedQuery = query.query.map(({ key, value, operator }) => `${key}${operator}${value}`).join("^");

    if (query.additionalQuery) {
      composedQuery += query.additionalQuery;
    }

    // always order to enable pagination to work on a stable order
    composedQuery += `^ORDERBYsys_created_on`;

    return encodeURI(composedQuery);
  }

  private getRequestOptions = async () => {
    const options = {
      headers: {
        Accept: "application/json",
      },
    };
    const apiKey = await this.auth.getApiKey();

    switch (this.server.authMethod) {
      case AuthMethod.BASIC_AUTH: {
        const encodedAuth = Buffer.from(`${this.server.email}:${apiKey}`).toString("base64");
        options.headers["Authorization"] = `Basic ${encodedAuth}`;
        break;
      }
      case AuthMethod.BEARER_TOKEN: {
        options.headers["Authorization"] = `Bearer ${apiKey}`;
        break;
      }
      case AuthMethod.CUSTOM: {
        options.headers["x-sn-apikey"] = apiKey;
        break;
      }
      default: {
        throw new Error(`Unsupported auth method: ${this.server.authMethod}`);
      }
    }

    return options;
  };
}

type ServiceNowConfigManager = TicketConfigManager<WorkloadTicketConfigServiceNow, ServiceNowTicketOptions>;

export class ServiceNowTicketService implements TicketService {
  private configManager: ServiceNowConfigManager;
  private cache: Datastore<{ workload: string; key: string }, DatastoreCollection>;
  private connections = new Map<WorkloadId, ServiceNowClient>();

  constructor(configManager: ServiceNowConfigManager) {
    this.configManager = configManager;
    this.cache = provideDatastore("serviceNow", {
      expireAfterSeconds: EXPIRY_SECONDS,
    });
  }

  private getConnection(workloadId: WorkloadId): ServiceNowClient {
    let connection: ServiceNowClient = this.connections.get(workloadId);
    if (!connection) {
      const server = this.getServiceNowServer(workloadId);
      connection = new ServiceNowClient(server);
      this.connections.set(workloadId, connection);
    }
    return connection;
  }

  private getServiceNowServer = (workloadId: string): ServiceNowServer => {
    return this.configManager.getServerConfig(TicketManagementTypes.SERVICENOW, workloadId) as ServiceNowServer;
  };

  fetchTickets = async (
    workloadId: WorkloadId,
    startDate: Date,
    endDate: Date | null,
    priority: string,
    timeRangeMode: TimeRangeMode,
  ): Promise<LightweightIssue[]> => {
    const workload = getWorkloadById(workloadId);
    const ticketManagement = this.configManager.getWorkloadConfig(workloadId);

    const queryFields: ServiceNowQueryArg[] = [];

    const dateFieldName = timeRangeMode === TimeRangeMode.CreatedWithinRange ? "sys_created_on" : "closed_at";
    queryFields.push({
      key: dateFieldName,
      operator: ">",
      value: `javascript:gs.dateGenerate('${truncateDateOnly(startDate)}','23:59:59')`,
    });

    if (priority) {
      queryFields.push({
        key: "severity",
        operator: ">",
        value: priority,
      });
    }

    if (endDate) {
      queryFields.push({
        key: "closed_at",
        operator: "<",
        value: `javascript:gs.dateGenerate('${truncateDateOnly(endDate)}','23:59:59')`,
      });
    }

    // this might use service, service_offering etc.
    const additionalQuery = ticketManagement?.teamFilterQuery ? `^${ticketManagement.teamFilterQuery}` : undefined;

    const allTickets: LightweightIssue[] = [];

    // in reality there will be one incident table name
    const tableNames = this.getTicketTypesByWorkloadId(workload.id);
    for (const tableName of tableNames) {
      const query: ServiceNowQuery = {
        tableName,
        fields: COMMON_FIELDS,
        query: queryFields,
        additionalQuery,
      };

      const tickets = await this.fetchIssues(workload, query);
      allTickets.push(...tickets);
    }
    return allTickets;
  };

  fetchOpenTickets = async (
    workloadId: WorkloadId,
    startDate: Date,
    endDate: Date,
    priority: string | number,
  ): Promise<LightweightIssue[]> => {
    warn("ServiceNow does not support fetching open issues.");
    return [];
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAllTicketIds = (workload: Workload, daysBack: number, issueTypes?: string[]): Promise<string[]> => {
    warn("ServiceNow does not support fetching all issue IDs.");
    return Promise.resolve([]);
  };

  getTicketTypesByWorkloadId = (workloadId: WorkloadId): string[] => {
    const ticketManagement = this.configManager.getWorkloadConfig(workloadId);
    const serverDefaults = this.configManager.getServerDefaults(workloadId);

    if (ticketManagement?.tableName) {
      return [ticketManagement.tableName];
    } else if (serverDefaults?.tableName) {
      return [serverDefaults.tableName];
    } else {
      return this.configManager.getDefaultTicketTypes();
    }
  };

  getAvailableIssueTypes = (workloadId: WorkloadId): string[] => {
    return this.getTicketTypesByWorkloadId(workloadId);
  };

  getTicket = async (workloadId: WorkloadId, issueId: string): Promise<LightweightIssue | null> => {
    try {
      return await this.cache.findOrInsertOne(COLLECTION_NAME_ISSUES, { workload: workloadId, key: issueId }, () =>
        this.getIssueDetails(workloadId, issueId),
      );
    } catch (e) {
      warn(`Failed to get ticket: ${issueId}: ${e.message}`);
      return null;
    }
  };

  matchTicketId(message: string): string | null {
    const matcher: RegExpMatchArray = message?.match(TICKET_NUMBER_PATTERN);
    return matcher ? matcher[0] : null;
  }

  buildTicketLink = (workloadId: WorkloadId, issueId: string): string =>
    `${getAllIssueManagementUrls()[workloadId]}/browse/${issueId}`;

  /**
   * @param workloadId
   * @param query
   */
  private fetchAllIssuesViaAPI = async (
    workloadId: WorkloadId,
    query: ServiceNowQuery,
  ): Promise<ServiceNowTicket[]> => {
    const client = this.getConnection(workloadId);
    return client.listTickets(query);
  };

  private fetchIssues = async (workload: Workload, query: ServiceNowQuery): Promise<LightweightIssue[]> => {
    const issues: LightweightIssue[] = [];
    const workloadIssues = await this.fetchAllIssuesAndMap<LightweightIssue>(workload, query, (issue) => {
      return this.mapLightweightIssue(issue, workload.id, query.tableName);
    });
    issues.push(...workloadIssues);
    return issues;
  };

  fetchAllIssuesAndMap = async <T>(
    workload: Workload,
    query: ServiceNowQuery,
    mapFn: (issue: ServiceNowTicket) => T,
  ): Promise<T[]> => {
    try {
      const allIssues = await this.fetchAllIssuesViaAPI(workload.id, query);
      return allIssues.map(mapFn);
    } catch (err) {
      throw new Error(`ServiceNow error with query: ${query} - error: ${err}`);
    }
  };

  private mapLightweightIssue = (ticket: ServiceNowTicket, workloadId: string, tableName: string): LightweightIssue => {
    return {
      key: ticket.number,
      issueType: tableName,
      created: ticket.sys_created_on,
      resolutiondate: ticket.closed_at,
      priority: ticket.severity,
      title: ticket.short_description,
      workload: workloadId,
    };
  };

  private getIssueDetails = async (workloadId: WorkloadId, issueId: string): Promise<LightweightIssue | null> => {
    const query: ServiceNowQuery = {
      tableName: this.configManager.getDefaultTicketTypes()[0], // TODO pull from config
      fields: COMMON_FIELDS,
      limit: 1,
      query: [
        {
          key: "number",
          operator: "=",
          value: issueId,
        },
      ],
    };

    const issues = await this.fetchAllIssuesViaAPI(workloadId, query);
    if (issues.length > 0) {
      const issue = issues[0];
      return this.mapLightweightIssue(issue, workloadId, query.tableName);
    }
    return null;
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
      verbose(`Failed to retrieve ${issueId} - assuming invalid ticket`);
      return null;
    }
  };
}
