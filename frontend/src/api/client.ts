/**
 * Fetch-based HTTP client with authentication interceptors.
 * Replaces axios with native fetch for reduced bundle size.
 */
import { useAuthStore } from "@/store/auth";
import { useDialogStore } from "@/store/dialog";
import { Paths } from "@/router/paths";
import { REFRESH } from "@/api/endpoints";
import i18n from "@/i18n";

/**
 * Don't add auth headers for requests to these URLs.
 */
const AUTH_HEADERS_EXCLUDE_LIST: string[] = [];

/**
 * Don't update the last request timestamp for requests to these URLs.
 */
const REQUEST_TIMESTAMP_EXCLUDE_LIST: string[] = [REFRESH];

let lastRequestTimestamp: number | null = null;
let apiBaseUrl = "";

export const setApiBaseUrl = (url: string) => {
  console.log(`Setting API base URL to '${url}'`);
  apiBaseUrl = url;
};

export const getApiBaseUrl = (): string => apiBaseUrl;

export const getTimeSinceLastRequest = (): number => {
  if (lastRequestTimestamp === null) {
    return Number.MAX_VALUE;
  }
  return Date.now() - lastRequestTimestamp;
};

export async function addAuthQueryParam(url: string): Promise<string> {
  const authState = useAuthStore.getState();

  if (AUTH_HEADERS_EXCLUDE_LIST.includes(url)) return url;

  if (authState.isAuthenticated) {
    const accessToken = authState.tokens?.accessToken;
    url += `&token=${accessToken}`;
  }

  return url;
}

async function kickOutIfUnauthorised(status: number) {
  if (status === 401 && window.location.pathname !== Paths.Login) {
    const dialogStore = useDialogStore.getState();
    const authStore = useAuthStore.getState();

    // Show dialog to inform user their session has expired
    dialogStore.push({
      deduplicationId: "session-expired",
      title: i18n.t("pages:session.expired.title"),
      subtitle: i18n.t("pages:session.expired.subtitle"),
      text: i18n.t("pages:session.expired.text"),
      confirmTitle: i18n.t("pages:session.expired.confirm"),
      showCancel: false,
      onDismiss: async () => {
        await authStore.logout();
      },
    });
  }
}

/**
 * Custom error class for HTTP errors (replaces AxiosError)
 */
export class HttpError extends Error {
  response: {
    status: number;
    statusText: string;
    data: unknown;
  };

  constructor(message: string, status: number, statusText: string, data: unknown) {
    super(message);
    this.name = "HttpError";
    this.response = { status, statusText, data };
  }
}

export interface RequestConfig {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
}

/**
 * Build a full URL with query parameters and base URL
 */
function buildUrl(url: string, params?: Record<string, string | number | boolean | undefined>): string {
  // Prepend base URL if the URL is relative
  const fullUrl = url.startsWith("http") ? url : `${apiBaseUrl}${url}`;

  if (!params) return fullUrl;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  if (!queryString) return fullUrl;

  return fullUrl.includes("?") ? `${fullUrl}&${queryString}` : `${fullUrl}?${queryString}`;
}

/**
 * Get auth headers if authenticated
 */
function getAuthHeaders(url: string): Record<string, string> {
  const authState = useAuthStore.getState();

  if (AUTH_HEADERS_EXCLUDE_LIST.includes(url)) {
    return {};
  }

  if (authState.isAuthenticated) {
    const accessToken = authState.tokens?.accessToken;
    return { Authorization: `Bearer ${accessToken}` };
  }

  return {};
}

/**
 * Update last request timestamp (for session timeout tracking)
 */
function updateTimestamp(url: string) {
  if (!REQUEST_TIMESTAMP_EXCLUDE_LIST.includes(url)) {
    lastRequestTimestamp = Date.now();
  }
}

/**
 * Core fetch wrapper with interceptor-like behavior
 */
async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  config?: RequestConfig
): Promise<{ data: T; status: number }> {
  const fullUrl = buildUrl(url, config?.params);

  updateTimestamp(url);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(url),
    ...config?.headers,
  };

  const response = await fetch(fullUrl, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Handle non-2xx responses
  if (!response.ok) {
    await kickOutIfUnauthorised(response.status);

    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }

    throw new HttpError(
      `Request failed with status ${response.status}`,
      response.status,
      response.statusText,
      errorData
    );
  }

  // Parse JSON response (handle empty responses)
  let data: T;
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    data = await response.json();
  } else {
    data = (await response.text()) as T;
  }

  return { data, status: response.status };
}

/**
 * HTTP client with axios-compatible API
 */
const client = {
  async get<T = unknown>(url: string, config?: RequestConfig): Promise<{ data: T; status: number }> {
    return request<T>("GET", url, undefined, config);
  },

  async post<T = unknown>(url: string, body?: unknown, config?: RequestConfig): Promise<{ data: T; status: number }> {
    return request<T>("POST", url, body, config);
  },

  async put<T = unknown>(url: string, body?: unknown, config?: RequestConfig): Promise<{ data: T; status: number }> {
    return request<T>("PUT", url, body, config);
  },

  async delete<T = unknown>(url: string, config?: RequestConfig): Promise<{ data: T; status: number }> {
    return request<T>("DELETE", url, undefined, config);
  },

  async patch<T = unknown>(url: string, body?: unknown, config?: RequestConfig): Promise<{ data: T; status: number }> {
    return request<T>("PATCH", url, body, config);
  },
};

export default client;
