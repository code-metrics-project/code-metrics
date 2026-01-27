import { Octokit } from "@octokit/rest";
import { TicketConfigManager, TicketService, TimeRangeMode } from "./ticketService";
import { Workload, WorkloadId, WorkloadTicketConfigGithub } from "../../model/config/workload-config";
import { LightweightIssue } from "../../model/tickets";
import { provideDatastore } from "../../db/factory";
import { GithubTicketOptions } from "../../model/config/common";
import { getAllTicketManagementConfig, getWorkloadById } from "../../config/configMapping";
import { isValidDate, safeParseDate } from "../../utils/date";
import { AuthMethod } from "../../model/config/remote-config";
import { createGitHubAppOctokit } from "../auth/github-app";
import { error, logger, warn } from "../../utils/logger/logger";

const EXPIRY_SECONDS: number = process.env.EXPIRY_SECONDS ? parseInt(process.env.EXPIRY_SECONDS) : 3600;
const ORG_ISSUE_TYPES_TTL: number = 24 * 60 * 60; // Cache org issue types for 24 hours
const GITHUB_ISSUE_ID_REGEX = /(?:^|\s)#(\d+)(?:\s|$)/;

type GithubConfigManager = TicketConfigManager<WorkloadTicketConfigGithub, GithubTicketOptions>;

// GitHub API responses for issues
type GitHubIssue = {
  number: number;
  title: string;
  state: string;
  created_at: string;
  closed_at: string | null;
  labels: Array<{ name: string }>;
  html_url: string;
  pull_request?: object; // Present if this is a pull request, not an issue
};

// GitHub organization issue types from the API
type GitHubIssueType = {
  id: number;
  node_id?: string;
  name: string;
  description: string | null;
  color?: "gray" | "blue" | "green" | "yellow" | "orange" | "red" | "pink" | "purple";
  created_at?: string;
  updated_at?: string;
  is_enabled?: boolean;
  default?: boolean; // Some issue types may be marked as default
  labels?: Array<{ name: string }>;
};

/**
 * The Github implementation of the ticket service.
 */
export class GithubTicketService implements TicketService {
  private configManager: GithubConfigManager;
  private datastore = provideDatastore("github-issues", { ttlIfToday: EXPIRY_SECONDS });
  private connections = new Map<WorkloadId, Octokit>();
  private orgIssueTypesCache = new Map<string, { types: GitHubIssueType[]; timestamp: number }>();

  constructor(configManager: GithubConfigManager) {
    this.configManager = configManager;
    this.datastore = provideDatastore("github-issues", {
      expireAfterSeconds: EXPIRY_SECONDS,
    });
  }

  #getConnection(workloadId: WorkloadId) {
    let connection = this.connections.get(workloadId);
    if (!connection) {
      const workload = getWorkloadById(workloadId);
      if (!workload) {
        throw new Error(`No workload found getting Github tickets connection with ID: ${workloadId}`);
      }
      const serverId = workload.projectManagement.serverId;
      const server = getAllTicketManagementConfig().github.servers.find((server) => server.id === serverId);
      if (!server) {
        throw new Error(`No GitHub server configuration found in ticket management config named: ${serverId}`);
      }

      // Support both GitHub App and Personal Access Token authentication
      if (server.authMethod === AuthMethod.GITHUB_APP && server.githubApp) {
        // Use GitHub App authentication
        connection = createGitHubAppOctokit(server.githubApp, server.url);
      } else {
        // Use Personal Access Token authentication (default)
        connection = new Octokit({
          auth: server.apiKey,
          baseUrl: server.url || "https://api.github.com",
        });
      }

      this.connections.set(workloadId, connection);
    }
    return connection;
  }

  /**
   * Get the owner and repo for a specific workload
   */
  #getOwnerAndRepo(workloadId: WorkloadId): { owner: string; repo: string } {
    const config = this.configManager.getWorkloadConfig(workloadId);
    if (!config) {
      throw new Error(`No GitHub configuration found for workload: ${workloadId}`);
    }

    return {
      owner: config.owner,
      repo: config.repo,
    };
  }

  /**
   * Convert a GitHub issue to a LightweightIssue
   * If organization issue types are available, uses that information
   * Otherwise falls back to label-based issue type determination
   */
  #convertToLightweightIssue(
    issue: GitHubIssue & { orgIssueType?: GitHubIssueType },
    workloadId: WorkloadId,
  ): LightweightIssue {
    const config = this.configManager.getWorkloadConfig(workloadId);

    // Determine issue type - first try organization issue type, then fall back to labels
    let issueType: string;

    // If we have an organization issue type from the API, use that
    if (issue.orgIssueType && issue.orgIssueType.name) {
      issueType = issue.orgIssueType.name.toLowerCase();
    } else {
      // Fall back to traditional label-based issue type determination
      const labels = issue.labels?.map((label) => label.name) || [];
      issueType = labels.find((label) => (config.ticketTypes || ["issue"]).includes(label)) || "issue";
    }

    // Determine priority from labels using the labelMapping or default to "Medium"
    let priority = "Medium";
    if (config.labelMapping) {
      const labels = issue.labels?.map((label) => label.name) || [];
      for (const label of labels) {
        if (config.labelMapping[label]) {
          priority = config.labelMapping[label];
          break;
        }
      }
    }

    // Validate dates before returning using our date utilities
    let created = null;
    let resolutiondate = null;

    // Use our utility functions to validate and parse dates
    if (isValidDate(issue.created_at)) {
      created = issue.created_at;
    } else {
      warn(`Issue #${issue.number} has invalid created_at date, using current date`);
      created = new Date().toISOString();
    }

    // For resolution date, only set if it's a valid date
    if (issue.closed_at && isValidDate(issue.closed_at)) {
      resolutiondate = issue.closed_at;
    }

    return {
      key: `#${issue.number}`,
      issueType,
      created: created,
      resolutiondate: resolutiondate,
      priority,
      workload: workloadId,
      title: issue.title || `Issue #${issue.number}`,
    };
  }

  /**
   * Get available issue types (labels) for the given workload.
   * Returns configured ticketTypes from workload config or defaults.
   */
  getAvailableIssueTypes(workloadId: WorkloadId): string[] {
    const config = this.configManager.getWorkloadConfig(workloadId);
    const serverDefaults = this.configManager.getServerDefaults(workloadId);

    if (config?.ticketTypes && config.ticketTypes.length > 0) {
      return config.ticketTypes;
    } else if (serverDefaults?.ticketTypes && serverDefaults.ticketTypes.length > 0) {
      return serverDefaults.ticketTypes;
    } else {
      return this.configManager.getDefaultTicketTypes();
    }
  }

  /**
   * Build a link to the GitHub issue
   */
  buildTicketLink(workloadId: WorkloadId, issueId: string): string {
    const workload = getWorkloadById(workloadId);
    const serverId = workload.projectManagement.serverId;
    const server = getAllTicketManagementConfig().github.servers.find((server) => server.id === serverId);
    if (!server || !server.url) {
      return "";
    }

    const { owner, repo } = this.#getOwnerAndRepo(workloadId);
    const issueNumber = issueId.startsWith("#") ? issueId.substring(1) : issueId;

    const baseUrl = server.url.endsWith("/") ? server.url.slice(0, -1) : server.url;
    // Handle GitHub Enterprise or GitHub.com URL patterns
    const isGithubDotCom = baseUrl === "https://api.github.com";

    if (isGithubDotCom) {
      return `https://github.com/${owner}/${repo}/issues/${issueNumber}`;
    } else {
      // For GitHub Enterprise
      const apiIndex = baseUrl.indexOf("/api/v3");
      const baseGithubUrl = apiIndex > 0 ? baseUrl.substring(0, apiIndex) : baseUrl;
      return `${baseGithubUrl}/${owner}/${repo}/issues/${issueNumber}`;
    }
  }

  /**
   * Fetch tickets based on provided filters
   */
  async fetchTickets(
    workloadId: string,
    startDate: Date,
    endDate: Date,
    priority: string | number,
    timeRangeMode: TimeRangeMode,
  ): Promise<LightweightIssue[]> {
    // Validate dates are present and valid before proceeding
    if (!startDate || !isValidDate(startDate)) {
      error(`Invalid startDate provided to GitHub fetchTickets: ${startDate}`);
      return [];
    }

    if (!endDate || !isValidDate(endDate)) {
      error(`Invalid endDate provided to GitHub fetchTickets: ${endDate}`);
      endDate = new Date(); // Default to now if invalid
    }

    const cacheKey = `issues:${workloadId}:${startDate.toISOString()}:${endDate.toISOString()}:${priority}:${timeRangeMode}`;

    return this.datastore
      .findOrInsertOneDated("github-issues", startDate, { key: cacheKey }, async () => {
        const octokit = this.#getConnection(workloadId);
        const { owner, repo } = this.#getOwnerAndRepo(workloadId);
        const config = this.configManager.getWorkloadConfig(workloadId);

        // Set default stateFilter if not provided
        const stateFilter = config.stateFilter || "all";

        // Format dates for GitHub API queries
        const since = startDate.toISOString();
        const issues: GitHubIssue[] = [];
        const issueNumbersSet = new Set<number>();

        try {
          // Fetch issues using both type (GitHub native issue types) and labels (configuration-based)
          // This ensures we get issues that match either criteria
          if (config.ticketTypes && config.ticketTypes.length > 0) {
            // Fetch issues by GitHub native issue type using the 'type' parameter
            for (const ticketType of config.ticketTypes) {
              const typeQueryParams: any = {
                owner,
                repo,
                state: stateFilter,
                since,
                per_page: 100,
                type: ticketType,
              };

              const typeIterator = octokit.paginate.iterator(octokit.issues.listForRepo, typeQueryParams);
              for await (const { data } of typeIterator) {
                const typedIssues = data as unknown as GitHubIssue[];
                for (const issue of typedIssues) {
                  if (!issueNumbersSet.has(issue.number)) {
                    issues.push(issue);
                    issueNumbersSet.add(issue.number);
                  }
                }
              }
            }

            // Fetch issues by labels (for label-based configuration)
            const labelsQueryParams: any = {
              owner,
              repo,
              state: stateFilter,
              since,
              per_page: 100,
              labels: config.ticketTypes.join(","),
            };

            const labelsIterator = octokit.paginate.iterator(octokit.issues.listForRepo, labelsQueryParams);
            for await (const { data } of labelsIterator) {
              const labeledIssues = data as unknown as GitHubIssue[];
              for (const issue of labeledIssues) {
                if (!issueNumbersSet.has(issue.number)) {
                  issues.push(issue);
                  issueNumbersSet.add(issue.number);
                }
              }
            }
          } else {
            // No ticketTypes configured, fetch all issues
            const queryParams: {
              owner: string;
              repo: string;
              state: "all" | "open" | "closed";
              since: string;
              per_page: number;
            } = {
              owner,
              repo,
              state: stateFilter as "all" | "open" | "closed",
              since,
              per_page: 100,
            };

            const iterator = octokit.paginate.iterator(octokit.issues.listForRepo, queryParams);
            for await (const { data } of iterator) {
              issues.push(...(data as unknown as GitHubIssue[]));
            }
          }

          // Filter out pull requests - GitHub's Issues API includes PRs
          // PRs have a 'pull_request' key that issues don't have
          const issuesOnly = issues.filter((issue) => !issue.pull_request);

          // Additional deduplication step (already done during fetch when ticketTypes configured,
          // but needed for the no-ticketTypes case and as a safety check)
          const seenNumbers = new Set<number>();
          const deduplicatedIssues = issuesOnly.filter((issue) => {
            if (seenNumbers.has(issue.number)) {
              return false;
            }
            seenNumbers.add(issue.number);
            return true;
          });

          // Filter issues based on timeRangeMode and date range
          const filteredIssues = deduplicatedIssues.filter((issue) => {
            try {
              // Validate date strings before parsing
              if (!issue.created_at) {
                warn(`Issue ${issue.number} has no created_at date, skipping`);
                return false;
              }

              // Use our utility functions to validate and parse dates
              if (!isValidDate(issue.created_at)) {
                warn(`Issue ${issue.number} has invalid created_at date: ${issue.created_at}, skipping`);
                return false;
              }

              const createdDate = safeParseDate(issue.created_at);
              if (!createdDate) {
                warn(`Issue ${issue.number} has unparseable created_at date: ${issue.created_at}, skipping`);
                return false;
              }

              // Handle closed_at date
              const resolvedDate = issue.closed_at ? safeParseDate(issue.closed_at) : null;
              if (issue.closed_at && !resolvedDate) {
                warn(`Issue ${issue.number} has invalid closed_at date: ${issue.closed_at}, using null`);
              }

              if (timeRangeMode === TimeRangeMode.CreatedWithinRange) {
                return createdDate >= startDate && createdDate <= endDate;
              } else if (timeRangeMode === TimeRangeMode.ResolvedWithinRange) {
                return resolvedDate && resolvedDate >= startDate && resolvedDate <= endDate;
              }
              return false;
            } catch (error) {
              warn(`Error processing dates for issue ${issue.number}: ${error}`);
              return false;
            }
          });

          // Filter by priority if specified and labelMapping is provided
          let priorityFilteredIssues = filteredIssues;
          if (priority && config.labelMapping) {
            const priorityLabels = Object.entries(config.labelMapping)
              .filter(([, p]) => p === priority.toString())
              .map(([label]) => label);

            if (priorityLabels.length > 0) {
              priorityFilteredIssues = filteredIssues.filter((issue) =>
                issue.labels.some((label) => priorityLabels.includes(label.name)),
              );
            }
          }

          // Enhance issues with organization issue types if available
          const enhancedIssues = await this.#enhanceIssuesWithTypes(priorityFilteredIssues, workloadId);

          // Convert to LightweightIssue format
          return {
            key: cacheKey,
            issues: enhancedIssues.map((issue) => this.#convertToLightweightIssue(issue, workloadId)),
          };
        } catch (err) {
          error(`Error fetching GitHub issues for ${workloadId}:`, err);
          return {
            key: cacheKey,
            issues: [],
          };
        }
      })
      .then((result) => result.issues || []);
  }

  /**
   * Fetch only open tickets
   */
  async fetchOpenTickets(
    workloadId: WorkloadId,
    startDate: Date,
    endDate: Date,
    priority: string | number,
  ): Promise<LightweightIssue[]> {
    // Validate dates are present and valid before proceeding
    if (!startDate || !isValidDate(startDate)) {
      error(`Invalid startDate provided to GitHub fetchOpenTickets: ${startDate}`);
      return [];
    }

    if (!endDate || !isValidDate(endDate)) {
      error(`Invalid endDate provided to GitHub fetchOpenTickets: ${endDate}`);
      endDate = new Date(); // Default to now if invalid
    }

    const cacheKey = `open-issues:${workloadId}:${startDate.toISOString()}:${endDate.toISOString()}:${priority}`;

    return this.datastore
      .findOrInsertOneDated("github-issues", startDate, { key: cacheKey }, async () => {
        const octokit = this.#getConnection(workloadId);
        const { owner, repo } = this.#getOwnerAndRepo(workloadId);
        const config = this.configManager.getWorkloadConfig(workloadId);

        try {
          const issues: GitHubIssue[] = [];
          const issueNumbersSet = new Set<number>();

          // Fetch issues using both type (GitHub native issue types) and labels (configuration-based)
          if (config.ticketTypes && config.ticketTypes.length > 0) {
            // Fetch issues by GitHub native issue type using the 'type' parameter
            for (const ticketType of config.ticketTypes) {
              const typeQueryParams: any = {
                owner,
                repo,
                state: "open",
                since: startDate.toISOString(),
                per_page: 100,
                type: ticketType,
              };

              const typeIterator = octokit.paginate.iterator(octokit.issues.listForRepo, typeQueryParams);
              for await (const { data } of typeIterator) {
                const typedIssues = data as unknown as GitHubIssue[];
                for (const issue of typedIssues) {
                  if (!issueNumbersSet.has(issue.number)) {
                    issues.push(issue);
                    issueNumbersSet.add(issue.number);
                  }
                }
              }
            }

            // Fetch issues by labels (for label-based configuration)
            const labelsQueryParams: any = {
              owner,
              repo,
              state: "open",
              since: startDate.toISOString(),
              per_page: 100,
              labels: config.ticketTypes.join(","),
            };

            const labelsIterator = octokit.paginate.iterator(octokit.issues.listForRepo, labelsQueryParams);
            for await (const { data } of labelsIterator) {
              const labeledIssues = data as unknown as GitHubIssue[];
              for (const issue of labeledIssues) {
                if (!issueNumbersSet.has(issue.number)) {
                  issues.push(issue);
                  issueNumbersSet.add(issue.number);
                }
              }
            }
          } else {
            // No ticketTypes configured, fetch all issues
            const queryParams: {
              owner: string;
              repo: string;
              state: "open";
              since: string;
              per_page: number;
            } = {
              owner,
              repo,
              state: "open",
              since: startDate.toISOString(),
              per_page: 100,
            };

            const iterator = octokit.paginate.iterator(octokit.issues.listForRepo, queryParams);
            for await (const { data } of iterator) {
              issues.push(...(data as unknown as GitHubIssue[]));
            }
          }

          // Filter out pull requests - GitHub's Issues API includes PRs
          const issuesOnly = issues.filter((issue) => !issue.pull_request);

          // Since we're already deduplicating during fetch, skip the second deduplication
          // but keep this for the no-ticketTypes case
          const seenNumbers = new Set<number>();
          const deduplicatedIssues = issuesOnly.filter((issue) => {
            if (seenNumbers.has(issue.number)) {
              return false;
            }
            seenNumbers.add(issue.number);
            return true;
          });

          // Filter issues created before endDate
          const dateFilteredIssues = deduplicatedIssues.filter((issue) => {
            const createdDate = new Date(issue.created_at);
            return createdDate >= startDate && createdDate <= endDate;
          });

          // Filter by priority if specified and labelMapping is provided
          let priorityFilteredIssues = dateFilteredIssues;
          if (priority && config.labelMapping) {
            const priorityLabels = Object.entries(config.labelMapping)
              .filter(([, p]) => p === priority.toString())
              .map(([label]) => label);

            if (priorityLabels.length > 0) {
              priorityFilteredIssues = dateFilteredIssues.filter((issue) =>
                issue.labels.some((label) => priorityLabels.includes(label.name)),
              );
            }
          }

          // Enhance issues with organization issue types if available
          const enhancedIssues = await this.#enhanceIssuesWithTypes(priorityFilteredIssues, workloadId);

          // Convert to LightweightIssue format
          return {
            key: cacheKey,
            issues: enhancedIssues.map((issue) => this.#convertToLightweightIssue(issue, workloadId)),
          };
        } catch (err) {
          error(`Error fetching open GitHub issues for ${workloadId}:`, err);
          return {
            key: cacheKey,
            issues: [],
          };
        }
      })
      .then((result) => result.issues || []);
  }

  /**
   * Get all ticket IDs from a workload within the last X days
   * @param workload - The workload to get tickets for
   * @param daysBack - Number of days to look back
   * @param issueTypes - Optional array of issue types (labels) to filter by. If not provided, uses default ticket types.
   */
  async getAllTicketIds(workload: Workload, daysBack: number, issueTypes?: string[]): Promise<string[]> {
    if (!workload) {
      return [];
    }

    const workloadId = workload.id;
    const issueTypesKey = issueTypes?.length ? issueTypes.join(",") : "default";
    const cacheKey = `issue-ids:${workloadId}:${daysBack}:${issueTypesKey}`;

    return this.datastore
      .findOrInsertOne("github-issues", { key: cacheKey }, async () => {
        try {
          const octokit = this.#getConnection(workloadId);
          const { owner, repo } = this.#getOwnerAndRepo(workloadId);
          const config = this.configManager.getWorkloadConfig(workloadId);

          // Calculate date for daysBack
          const startDate = new Date();
          if (isNaN(daysBack) || daysBack < 0) {
            warn(`Invalid daysBack value: ${daysBack}, defaulting to 30 days`);
            daysBack = 30;
          }
          startDate.setDate(startDate.getDate() - daysBack);

          if (!isValidDate(startDate)) {
            error(`Invalid calculated startDate for daysBack=${daysBack}, using 30 days ago`);
            startDate.setDate(new Date().getDate() - 30);
          }

          const issues: GitHubIssue[] = [];

          // Build query parameters - fetch all issues, filter by labels locally
          // Note: GitHub's labels parameter uses AND logic (all labels must match),
          // but we want OR logic (any label matches), so we filter after fetching
          const queryParams: {
            owner: string;
            repo: string;
            state: "all";
            since: string;
            per_page: number;
          } = {
            owner,
            repo,
            state: "all",
            since: startDate.toISOString(),
            per_page: 100,
          };

          // Use provided issueTypes if available, otherwise fall back to configured ticketTypes
          const effectiveIssueTypes = issueTypes?.length ? issueTypes : config.ticketTypes;

          // Paginate through all issues since startDate
          const iterator = octokit.paginate.iterator(octokit.issues.listForRepo, queryParams);

          for await (const { data } of iterator) {
            issues.push(...(data as unknown as GitHubIssue[]));
          }

          // Filter out pull requests - GitHub's Issues API includes PRs
          let issuesOnly = issues.filter((issue) => !issue.pull_request);

          // Filter by labels locally using OR logic (issue has ANY of the specified labels)
          if (effectiveIssueTypes && effectiveIssueTypes.length > 0) {
            const labelSet = new Set(effectiveIssueTypes.map((label) => label.toLowerCase()));
            issuesOnly = issuesOnly.filter((issue) =>
              issue.labels?.some((label) => {
                const labelName = typeof label === "string" ? label : label.name;
                return labelName && labelSet.has(labelName.toLowerCase());
              }),
            );
          }

          // Deduplicate by issue number
          const seenNumbers = new Set<number>();
          const deduplicatedIssues = issuesOnly.filter((issue) => {
            if (seenNumbers.has(issue.number)) {
              return false;
            }
            seenNumbers.add(issue.number);
            return true;
          });

          // Extract issue numbers
          const issueIds = deduplicatedIssues.map((issue) => `#${issue.number}`);

          logger(
            `GitHub getAllTicketIds for ${workloadId}: Found ${issueIds.length} issues with labels [${effectiveIssueTypes?.join(", ") || "none"}]`,
          );

          return {
            key: cacheKey,
            ids: issueIds,
          };
        } catch (err) {
          error(`Error fetching GitHub issue IDs for ${workloadId}:`, err);
          return {
            key: cacheKey,
            ids: [],
          };
        }
      })
      .then((result) => result.ids || []);
  }

  /**
   * Get a specific ticket by ID
   */
  async getTicket(workloadId: WorkloadId, issueId: string): Promise<LightweightIssue | null> {
    const cacheKey = `issue:${workloadId}:${issueId}`;

    return this.datastore
      .findOrInsertOne("github-issues", { key: cacheKey }, async () => {
        try {
          const octokit = this.#getConnection(workloadId);
          const { owner, repo } = this.#getOwnerAndRepo(workloadId);

          // Extract issue number from the ID (remove # if present)
          const issueNumber = parseInt(issueId.replace(/^#/, ""), 10);
          if (isNaN(issueNumber)) {
            return {
              key: cacheKey,
              ticket: null,
            };
          }

          const { data: issue } = await octokit.issues.get({
            owner,
            repo,
            issue_number: issueNumber,
          });

          if (!issue) {
            return {
              key: cacheKey,
              ticket: null,
            };
          }

          // Enhance issue with organization issue type if available
          const enhancedIssues = await this.#enhanceIssuesWithTypes([issue as unknown as GitHubIssue], workloadId);
          const enhancedIssue = enhancedIssues[0];

          return {
            key: cacheKey,
            ticket: this.#convertToLightweightIssue(enhancedIssue, workloadId),
          };
        } catch (err) {
          error(`Error fetching GitHub issue ${issueId} for ${workloadId}:`, err);
          return {
            key: cacheKey,
            ticket: null,
          };
        }
      })
      .then((result) => result.ticket);
  }

  /**
   * Match a ticket ID in a message and retrieve the ticket
   */
  async matchTicketByIdAndRetrieve(message: string | null, workloadId: WorkloadId): Promise<LightweightIssue | null> {
    if (!message) {
      return null;
    }

    const issueId = this.matchTicketId(message);
    if (!issueId) {
      return null;
    }

    return await this.getTicket(workloadId, issueId);
  }

  /**
   * Extract a ticket ID from a message
   */
  matchTicketId(message: string): string | null {
    if (!message) {
      return null;
    }

    const match = GITHUB_ISSUE_ID_REGEX.exec(message);
    return match ? `#${match[1]}` : null;
  }

  /**
   * Fetch organization issue types from the GitHub API
   * Uses the /orgs/{org}/issue-types endpoint
   * Caches the results to avoid repeated API calls
   */
  async #fetchOrganizationIssueTypes(workloadId: WorkloadId): Promise<GitHubIssueType[]> {
    const { owner } = this.#getOwnerAndRepo(workloadId);

    // Check if we have a recent cache entry
    const cacheKey = `org-issue-types:${owner}`;
    const cachedData = this.orgIssueTypesCache.get(cacheKey);
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < ORG_ISSUE_TYPES_TTL * 1000) {
      return cachedData.types;
    }

    try {
      const octokit = this.#getConnection(workloadId);
      const config = this.configManager.getWorkloadConfig(workloadId);

      // Call the new GitHub API endpoint for organization issue types
      const response = await octokit.request("GET /orgs/{org}/issue-types", {
        org: owner,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      if (response.data && Array.isArray(response.data)) {
        // Enhance the issue types with labels based on our configuration
        const issueTypes = response.data as unknown as GitHubIssueType[];

        // Mark a default type
        const defaultTypeIndex = issueTypes.findIndex((type) => type.name.toLowerCase() === "issue");
        if (defaultTypeIndex >= 0) {
          issueTypes[defaultTypeIndex].default = true;
        } else if (issueTypes.length > 0) {
          // If no "issue" type, mark the first one as default
          issueTypes[0].default = true;
        }

        // Add labels to issue types based on config
        if (config.ticketTypes && config.ticketTypes.length > 0) {
          for (const type of issueTypes) {
            // Find matching labels for this type in our configuration
            const matchingLabels = config.ticketTypes.filter(
              (label) => label.toLowerCase() === type.name.toLowerCase(),
            );

            // Add matching labels to this issue type
            if (matchingLabels.length > 0) {
              type.labels = matchingLabels.map((label) => ({ name: label }));
            }
          }
        }

        // Cache the enhanced issue types
        this.orgIssueTypesCache.set(cacheKey, {
          types: issueTypes,
          timestamp: now,
        });

        return issueTypes;
      }
    } catch (err) {
      warn(`Error fetching GitHub organization issue types for ${owner}:`, err);
      // If the API call fails, return an empty array but don't cache the failure
    }

    return [];
  }

  /**
   * Enhance GitHub issues with organization issue types
   * Matches issues to types based on their labels
   */
  async #enhanceIssuesWithTypes(issues: GitHubIssue[], workloadId: WorkloadId): Promise<GitHubIssue[]> {
    try {
      const orgTypes = await this.#fetchOrganizationIssueTypes(workloadId);

      if (!orgTypes || orgTypes.length === 0) {
        return issues; // No types available, return issues unmodified
      }

      // Create a map of label names to issue types for faster lookup
      const labelToTypeMap = new Map<string, GitHubIssueType>();
      orgTypes.forEach((type) => {
        if (type.labels && type.labels.length > 0) {
          type.labels.forEach((label) => {
            labelToTypeMap.set(label.name.toLowerCase(), type);
          });
        }
      });

      // Find the default type if any
      const defaultType = orgTypes.find((type) => type.default);

      // Deep clone issues to avoid modifying the original objects
      const enhancedIssues = JSON.parse(JSON.stringify(issues));

      // Enhance each issue with its organizational type information
      enhancedIssues.forEach((issue: GitHubIssue & { orgIssueType?: GitHubIssueType }) => {
        // Try to find a matching type based on labels
        let matchedType: GitHubIssueType | undefined;

        if (issue.labels && issue.labels.length > 0) {
          for (const label of issue.labels) {
            const matchedByLabel = labelToTypeMap.get(label.name.toLowerCase());
            if (matchedByLabel) {
              matchedType = matchedByLabel;
              break;
            }
          }
        }

        // If no match found, use default type if available
        if (!matchedType && defaultType) {
          matchedType = defaultType;
        }

        // Add the organizational issue type to the issue
        if (matchedType) {
          issue.orgIssueType = matchedType;
        }
      });

      return enhancedIssues;
    } catch (err) {
      error(`Error enhancing issues with organization types for ${workloadId}:`, err);
      return issues; // Return original issues if enhancement fails
    }
  }
}
