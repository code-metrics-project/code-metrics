import { useQuery } from "@tanstack/react-query";
import { CODE_HOTSPOTS } from "@/api/endpoints";
import client, { type HttpError } from "@/api/client";
import type { RepoData } from "@/model/vcs";
import { QUERY_KEYS } from "./keys";
import { capitalize } from "@/utils/string";
import type { APIError } from "@/model/apiError";

export type { RepoData };

export interface CodeHotspotsRequest {
  startDate: string;
  workload: string | null;
  issueTypes?: string[];
}

async function fetchCodeHotspots(query: CodeHotspotsRequest): Promise<RepoData[]> {
  const response = await client.post<RepoData[]>(CODE_HOTSPOTS, query).catch((e: HttpError) => {
    if (e.response?.data && typeof e.response.data === "object" && "errors" in e.response.data) {
      const errorMessages = (e.response.data as { errors: APIError }).errors
        .map((error) => {
          console.log(error.console);
          return `${error.title}: ${capitalize(error.detail)}.`;
        })
        .join("\r\n");
      throw new Error(errorMessages);
    }
    throw e;
  });

  return response.data;
}

export function useCodeHotspots(query: CodeHotspotsRequest, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEYS.CODE_HOTSPOTS, query],
    queryFn: () => fetchCodeHotspots(query),
    enabled,
  });
}
