import { useAuthStore } from "@/store/auth";
import router from "@/router";
import { Paths } from "@/router/paths";

/**
 * Don't add auth headers for requests to these URLs.
 */
const AUTH_HEADERS_EXCLUDE_LIST: string[] = [];

/**
 * Don't update the last request timestamp for requests to these URLs.
 */
const REQUEST_TIMESTAMP_EXCLUDE_LIST: string[] = ["/api/refresh"];

let lastRequestTimestamp: number | null = null;
let apiBaseUrl = "";

export interface RequestConfig {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

export class HttpError extends Error {
  response: HttpResponse<unknown>;

  constructor(message: string, status: number, headers: Headers, data: unknown) {
    super(message);
    this.name = "HttpError";
    this.response = {
      data,
      status,
      headers,
    };
  }
}

function updateLastRequestTimestamp(url: string) {
  if (!REQUEST_TIMESTAMP_EXCLUDE_LIST.includes(url)) {
    lastRequestTimestamp = Date.now();
  }
}

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

function addAuthHeaders(url: string, headers?: Record<string, string>): Record<string, string> {
  const authStore = useAuthStore();

  if (AUTH_HEADERS_EXCLUDE_LIST.includes(url)) {
    return headers ?? {};
  }

  if (authStore.isAuthenticated) {
    const accessToken = authStore.tokens?.accessToken;
    return {
      ...headers,
      Authorization: `Bearer ${accessToken}`,
    };
  }

  return headers ?? {};
}

export async function addAuthQueryParam(url: string): Promise<string> {
  const authStore = useAuthStore();

  if (AUTH_HEADERS_EXCLUDE_LIST.includes(url)) return url;

  if (authStore.isAuthenticated) {
    const accessToken = authStore.tokens?.accessToken;
    url += `&token=${accessToken}`;
  }

  return url;
}

async function kickOutIfUnauthorised(status: number) {
  if (status === 401 && router.currentRoute.value.fullPath !== Paths.Login) {
    const authStore = useAuthStore();
    await authStore.logout();
  }
}

function buildUrl(
  url: string,
  params?: Record<string, string | number | boolean | undefined>,
  baseURL?: string,
): string {
  const fullUrl = url.startsWith("http") ? url : `${baseURL ?? apiBaseUrl}${url}`;

  if (!params) {
    return fullUrl;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  if (!queryString) {
    return fullUrl;
  }

  return fullUrl.includes("?") ? `${fullUrl}&${queryString}` : `${fullUrl}?${queryString}`;
}

function isBinaryBody(body: unknown): body is ArrayBuffer | Blob | FormData | URLSearchParams {
  return (
    body instanceof ArrayBuffer || body instanceof Blob || body instanceof FormData || body instanceof URLSearchParams
  );
}

function prepareBody(body: unknown, headers: Record<string, string>): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (typeof body === "string" || isBinaryBody(body)) {
    return body;
  }

  if (!headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return JSON.stringify(body);
}

async function parseResponseBody<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  config?: RequestConfig,
  baseURL?: string,
  includeAuth = true,
  includeTimestamp = true,
  handleUnauthorized = true,
): Promise<HttpResponse<T>> {
  const fullUrl = buildUrl(url, config?.params, baseURL);

  if (includeTimestamp) {
    updateLastRequestTimestamp(url);
  }

  const headers = includeAuth ? addAuthHeaders(url, { ...(config?.headers ?? {}) }) : { ...(config?.headers ?? {}) };
  const preparedBody = prepareBody(body, headers);

  const response = await fetch(fullUrl, {
    method,
    headers,
    body: preparedBody,
  });

  const data = await parseResponseBody<T>(response);

  if (!response.ok) {
    if (handleUnauthorized) {
      await kickOutIfUnauthorised(response.status);
    }

    throw new HttpError(`Request failed with status ${response.status}`, response.status, response.headers, data);
  }

  return {
    data,
    status: response.status,
    headers: response.headers,
  };
}

type ApiClient = {
  get<T = unknown, R = HttpResponse<T>>(url: string, config?: RequestConfig): Promise<R>;
  post<T = unknown, R = HttpResponse<T>, D = unknown>(url: string, body?: D, config?: RequestConfig): Promise<R>;
  put<T = unknown, R = HttpResponse<T>, D = unknown>(url: string, body?: D, config?: RequestConfig): Promise<R>;
  delete<T = unknown, R = HttpResponse<T>>(url: string, config?: RequestConfig): Promise<R>;
  patch<T = unknown, R = HttpResponse<T>, D = unknown>(url: string, body?: D, config?: RequestConfig): Promise<R>;
};

type ClientDefaults = RequestConfig & { baseURL?: string };

function mergeConfig(defaults?: RequestConfig, config?: RequestConfig): RequestConfig | undefined {
  if (!defaults && !config) {
    return undefined;
  }

  return {
    ...defaults,
    ...config,
    headers: {
      ...(defaults?.headers ?? {}),
      ...(config?.headers ?? {}),
    },
    params: {
      ...(defaults?.params ?? {}),
      ...(config?.params ?? {}),
    },
  };
}

function createClient(defaults?: ClientDefaults, includeInterceptors = true): ApiClient {
  return {
    async get<T = unknown, R = HttpResponse<T>>(url: string, config?: RequestConfig): Promise<R> {
      return (await request<T>(
        "GET",
        url,
        undefined,
        mergeConfig(defaults, config),
        defaults?.baseURL,
        includeInterceptors,
        includeInterceptors,
        includeInterceptors,
      )) as R;
    },
    async post<T = unknown, R = HttpResponse<T>, D = unknown>(
      url: string,
      body?: D,
      config?: RequestConfig,
    ): Promise<R> {
      return (await request<T>(
        "POST",
        url,
        body,
        mergeConfig(defaults, config),
        defaults?.baseURL,
        includeInterceptors,
        includeInterceptors,
        includeInterceptors,
      )) as R;
    },
    async put<T = unknown, R = HttpResponse<T>, D = unknown>(
      url: string,
      body?: D,
      config?: RequestConfig,
    ): Promise<R> {
      return (await request<T>(
        "PUT",
        url,
        body,
        mergeConfig(defaults, config),
        defaults?.baseURL,
        includeInterceptors,
        includeInterceptors,
        includeInterceptors,
      )) as R;
    },
    async delete<T = unknown, R = HttpResponse<T>>(url: string, config?: RequestConfig): Promise<R> {
      return (await request<T>(
        "DELETE",
        url,
        undefined,
        mergeConfig(defaults, config),
        defaults?.baseURL,
        includeInterceptors,
        includeInterceptors,
        includeInterceptors,
      )) as R;
    },
    async patch<T = unknown, R = HttpResponse<T>, D = unknown>(
      url: string,
      body?: D,
      config?: RequestConfig,
    ): Promise<R> {
      return (await request<T>(
        "PATCH",
        url,
        body,
        mergeConfig(defaults, config),
        defaults?.baseURL,
        includeInterceptors,
        includeInterceptors,
        includeInterceptors,
      )) as R;
    },
  };
}

export const client = createClient();

export function create(config?: RequestConfig & { baseURL?: string }) {
  return createClient(config, false);
}
