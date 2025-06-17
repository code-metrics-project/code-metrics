import axios, { type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth";
import router from "@/router";
import { Paths } from "@/router/paths";

const AUTH_HEADERS_EXCLUDE_LIST: string[] = [];

async function addAuthHeaders(config: InternalAxiosRequestConfig) {
  const authStore = useAuthStore();

  if (config.url && AUTH_HEADERS_EXCLUDE_LIST.includes(config.url))
    return config;

  if (authStore.isAuthenticated) {
    const userToken = authStore.accessToken;
    config.headers.Authorization = `Bearer ${userToken}`;
  }

  return config;
}

export async function addAuthQueryParam(url: string): Promise<string> {
  const authStore = useAuthStore();

  if (AUTH_HEADERS_EXCLUDE_LIST.includes(url)) return url;

  if (authStore.isAuthenticated) {
    const userToken = authStore.accessToken;
    url += `&token=${userToken}`;
  }

  return url;
}

async function kickOutIfUnauthorised(status: number) {
  if (status === 401 && router.currentRoute.value.fullPath !== Paths.Login) {
    const authStore = useAuthStore();
    await authStore.logout();
  }
}

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
