import { useQuery } from "@tanstack/react-query";
import { fetchDependencyAlerts, type DependencyAlertsRequest } from "@/services/dependencyAlerts";
import { QUERY_KEYS } from "./keys";

export function useDependencyAlerts(request: DependencyAlertsRequest, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEYS.DEPENDENCY_ALERTS, request],
    queryFn: () => fetchDependencyAlerts(request),
    enabled: enabled && request.workloads.length > 0,
  });
}
