import { useQuery } from "@tanstack/react-query";
import client from "@/api/client";
import { DASHBOARDS, DASHBOARD } from "@/api/endpoints";
import { QUERY_KEYS } from "./keys";

export interface DashboardOption {
  id: string;
  name: string;
}

export interface DashboardDataSource {
  name: string;
  args?: Record<string, unknown>;
}

export interface DashboardDataView {
  name: string;
  props?: Record<string, unknown>;
}

export interface DashboardItem {
  id: string;
  dataSource: DashboardDataSource;
  dataView: DashboardDataView;
  presentationOptions?: {
    title?: string;
    width?: number;
  };
}

export interface Dashboard {
  id: string;
  name: string;
  data: DashboardItem[];
}

export function useDashboards() {
  return useQuery({
    queryKey: [QUERY_KEYS.DASHBOARDS],
    queryFn: async () => {
      const response = await client.get<DashboardOption[]>(DASHBOARDS);
      return response.data;
    },
  });
}

export function useDashboard(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.DASHBOARD, id],
    queryFn: async () => {
      if (!id) throw new Error("Dashboard ID is required");
      const response = await client.get<Dashboard>(DASHBOARD(id));
      return response.data;
    },
    enabled: !!id,
  });
}
