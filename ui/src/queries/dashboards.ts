import { client } from "@/utils/apiClient";
import { DASHBOARDS, DASHBOARD } from "@/utils/urls";
import { type TDashboardItem } from "@/components/dashboard/Dashboard.interface";

type TDashboardOptions = {
  id: string;
  name: string;
}[];

export type TDashboard = {
  id: string;
  name: string;
  data: TDashboardItem[];
};

export function getDashboards() {
  return client.get<TDashboardOptions>(DASHBOARDS);
}

export function getDashboard(id: string) {
  return client.get<TDashboard>(DASHBOARD(id));
}
