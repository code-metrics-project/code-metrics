import axios from "@/utils/axios";
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
  return axios.get<TDashboardOptions>(DASHBOARDS);
}

export function getDashboard(id: string) {
  return axios.get<TDashboard>(DASHBOARD(id));
}
