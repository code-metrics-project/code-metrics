import axios, { type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth";
import router from "@/router";
import { Paths } from "@/router/paths";
import { REFRESH } from "@/utils/urls.ts";

/**
 * Don't add auth headers for requests to these URLs.
 */
const AUTH_HEADERS_EXCLUDE_LIST: string[] = [];

/**
 * Don't update the last request timestamp for requests to these URLs.
 */
const REQUEST_TIMESTAMP_EXCLUDE_LIST: string[] = [REFRESH];

let lastRequestTimestamp: number | null = null;

async function updateLastRequestTimestamp(config: InternalAxiosRequestConfig) {
  if (!config.url || !REQUEST_TIMESTAMP_EXCLUDE_LIST.includes(config.url)) {
    lastRequestTimestamp = Date.now();
  }
  return config;
}

export const getTimeSinceLastRequest = (): number => {
  if (lastRequestTimestamp === null) {
    return Number.MAX_VALUE;
  }
  return Date.now() - lastRequestTimestamp;
};

async function addAuthHeaders(config: InternalAxiosRequestConfig) {
  const authStore = useAuthStore();

  if (config.url && AUTH_HEADERS_EXCLUDE_LIST.includes(config.url)) {
    return config;
  }

  if (authStore.isAuthenticated) {
    const accessToken = authStore.tokens?.accessToken;
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
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

axios.interceptors.request.use(updateLastRequestTimestamp);
axios.interceptors.request.use(addAuthHeaders);

axios.interceptors.response.use(
  // Anything inside 2xx
  (response) => response,

  // Anything outside 2xx
  async (error) => {
    const status = error.response.status;
    await kickOutIfUnauthorised(status);
    return Promise.reject(error);
  },
);

export default axios;
