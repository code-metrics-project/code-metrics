import { useQuery } from "@tanstack/react-query";
import { TEMPORAL_COUPLING } from "@/api/endpoints";
import client, { type HttpError } from "@/api/client";
import type { APIError } from "@/model/apiError";
import type { TemporalCouplingData, TemporalCouplingRequest } from "@/model/temporalCoupling";
import { QUERY_KEYS } from "./keys";
import { capitalize } from "@/utils/string";

async function fetchTemporalCoupling(query: TemporalCouplingRequest): Promise<TemporalCouplingData[]> {
  const response = await client.post<TemporalCouplingData[]>(TEMPORAL_COUPLING, query).catch((e: HttpError) => {
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

export function useTemporalCoupling(query: TemporalCouplingRequest, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEYS.TEMPORAL_COUPLING, query],
    queryFn: () => fetchTemporalCoupling(query),
    enabled,
  });
}
