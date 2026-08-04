/**
 * There doesn't appear to be any good npm packages currently that simplify connection to BitBucket cloud.
 * @atlassian/bitbucket-server hasn't been updated since 2019 and is missing helpers for some of the key endpoints we use.
 * bitbucket-server-nodejs hasn't been updated since 2019 and is missing helpers for some of the key endpoints we use.
 */
import http from "http";
import https from "https";
import { logger } from "./logger/logger";
import { limitedBitbucketFetch } from "./bitbucketServerConnectionRequest";

import { AuthMethod } from "../model/config/remote-config";

type RequestInit = globalThis.RequestInit;

type ClientOptions = {
  auth: {
    authMethod: AuthMethod;
    username: string;
    password: string;
  };
  baseUrl: string;
};

type PaginatedResponse<Values> = {
  values: Values[];
  size: number;
  limit: number;
  isLastPage: boolean;
  nextPageStart?: number;
  start: number;
};

type ProjectKey = {
  projectKey: string;
};

type RepositorySlug = {
  repositorySlug: string;
};

type PullRequestId = {
  pullRequestId: string;
};

type CommitId = {
  commitId: string;
};

type Repository = {
  name: string;
};

type PullRequest = {
  closed: boolean;
  closedDate: number;
  createdDate: number;
  description: string;
  fromRef: {
    id: string;
  };
  id: number;
  state: string;
  title: string;
  updatedDate: number;
};

type Error = {
  errors: {
    context: string;
    exceptionName: string;
    message: string;
  }[];
};

type Branch = {
  displayId: string;
  id: string;
  type: string;
};

type Commit = {
  committerTimestamp: number;
  id: string;
  message: string;
};

type Change = {
  path: {
    toString: string;
  };
};

export type BitbucketServerConnection = {
  projects: {
    repos: {
      get: (options: ProjectKey) => Promise<Repository[]>;

      branches: {
        commit: {
          get: (options: ProjectKey & RepositorySlug & CommitId) => Promise<Branch[]>;
        };
      };

      commit: {
        get: (options: ProjectKey & RepositorySlug & CommitId) => Promise<Commit>;
        changes: {
          get: (options: ProjectKey & RepositorySlug & CommitId) => Promise<Change[]>;
        };
      };

      commits: {
        get: (options: ProjectKey & RepositorySlug & { since: Date; until: Date }) => Promise<Commit[]>;

        pullRequests: {
          get: (options: ProjectKey & RepositorySlug & CommitId) => Promise<PullRequest[]>;
        };
      };

      pullRequest: {
        diff: {
          get: (options: ProjectKey & RepositorySlug & PullRequestId) => Promise<string>;
        };

        get: (options: ProjectKey & RepositorySlug & PullRequestId) => Promise<PullRequest>;
      };

      pullRequests: {
        get: (
          options: ProjectKey & RepositorySlug & { state: "ALL" | "OPEN" | "DECLINED" | "MERGED" },
        ) => Promise<PullRequest[]>;
      };
    };
  };
};

type PaginationWindow = {
  start: number;
  timestampProperty: string;
  end: number;
};

async function paginate<ResponseType>(
  rawUrl: URL | string,
  options: RequestInit,
  paginationWindow?: PaginationWindow,
  start = 0,
  values: ResponseType[] = [],
): Promise<ResponseType[]> {
  const url = new URL(rawUrl);
  url.searchParams.set("start", "" + start);
  url.searchParams.set("limit", "" + 100);

  try {
    const responseJson = await limitedBitbucketFetch<PaginatedResponse<ResponseType>>(url, options);

    let responseValues = responseJson.values;
    let isLastPage = responseJson.isLastPage;

    if (paginationWindow) {
      isLastPage =
        isLastPage ||
        responseValues[responseValues.length - 1][paginationWindow.timestampProperty] < paginationWindow.start;
      responseValues = responseValues.filter((response) => {
        return (
          response[paginationWindow.timestampProperty] < paginationWindow.end &&
          response[paginationWindow.timestampProperty] > paginationWindow.start
        );
      });
    }

    const aggregatedValues = [...values, ...responseValues];

    if (isLastPage) {
      return aggregatedValues;
    }

    return paginate(rawUrl, options, paginationWindow, responseJson.nextPageStart, aggregatedValues);
  } catch (error) {
    logger(`Failed to fetch ${url}`);
    return [...values];
  }
}

export function createBitbuckerServerConnection(options: ClientOptions): BitbucketServerConnection {
  const httpAgent = new http.Agent({ keepAlive: true });
  const httpsAgent = new https.Agent({ keepAlive: true });
  const agent = (_parsedURL) => (_parsedURL.protocol == "http:" ? httpAgent : httpsAgent);

  let auth = `Basic ${btoa(options.auth.username + ":" + options.auth.password)}`;
  if (options.auth.authMethod === AuthMethod.BEARER_TOKEN) {
    auth = `Bearer ${options.auth.password}`;
  }
  const headers = {
    Accept: "application/json",
    Authorization: auth,
  };

  return {
    projects: {
      repos: {
        async get(request) {
          return paginate<Repository>(`${options.baseUrl}/rest/api/latest/projects/${request.projectKey}/repos`, {
            method: "GET",
            headers,
            agent,
          });
        },

        branches: {
          commit: {
            async get(request) {
              return paginate<Branch>(
                `${options.baseUrl}/rest/branch-utils/latest/projects/${request.projectKey}/repos/${request.repositorySlug}/branches/info/${request.commitId}`,
                {
                  method: "GET",
                  headers,
                  agent,
                },
              );
            },
          },
        },

        commit: {
          async get(request) {
            return limitedBitbucketFetch<Commit>(
              `${options.baseUrl}/rest/api/latest/projects/${request.projectKey}/repos/${request.repositorySlug}/commits/${request.commitId}`,
              {
                method: "GET",
                headers,
                agent,
              },
            );
          },

          changes: {
            async get(request) {
              return paginate<Change>(
                `${options.baseUrl}/rest/api/latest/projects/${request.projectKey}/repos/${request.repositorySlug}/commits/${request.commitId}/changes`,
                {
                  method: "GET",
                  headers,
                  agent,
                },
              );
            },
          },
        },

        commits: {
          async get({ projectKey, repositorySlug, since, until }) {
            const url = new URL(
              `${options.baseUrl}/rest/api/latest/projects/${projectKey}/repos/${repositorySlug}/commits`,
            );
            return paginate<Commit>(
              url,
              {
                method: "GET",
                headers,
                agent,
              },
              {
                start: since.getTime(),
                timestampProperty: "authorTimestamp",
                end: until.getTime(),
              },
            );
          },

          pullRequests: {
            async get(request) {
              return paginate<PullRequest>(
                `${options.baseUrl}/rest/api/latest/projects/${request.projectKey}/repos/${request.repositorySlug}/commits/${request.commitId}/pull-requests`,
                {
                  method: "GET",
                  headers,
                  agent,
                },
              );
            },
          },
        },

        pullRequest: {
          diff: {
            async get(request) {
              const headers = {
                Accept: "text/plain",
                Authorization: auth,
              };
              return limitedBitbucketFetch<string>(
                `${options.baseUrl}/rest/api/latest/projects/${request.projectKey}/repos/${request.repositorySlug}/pull-requests/${request.pullRequestId}.diff`,
                {
                  method: "GET",
                  headers,
                  agent,
                },
                false,
              );
            },
          },

          async get(request) {
            return limitedBitbucketFetch<PullRequest>(
              `${options.baseUrl}/rest/api/latest/projects/${request.projectKey}/repos/${request.repositorySlug}/pull-requests/${request.pullRequestId}`,
              {
                method: "GET",
                headers,
                agent,
              },
            );
          },
        },

        pullRequests: {
          async get(request) {
            return paginate<PullRequest>(
              `${options.baseUrl}/rest/api/latest/projects/${request.projectKey}/repos/${request.repositorySlug}/pull-requests?state=${request.state}`,
              {
                method: "GET",
                headers,
                agent,
              },
            );
          },
        },
      },
    },
  };
}
