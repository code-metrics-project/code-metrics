import { type TDataSourceType } from "@/components/dashboard/dataSources";
import { type TDataRendererType } from "@/components/dashboard/dataRenderers";

export type TDashboardCard = {
  dataSource: TDataSourceType;
  dataView: TDataRendererType;
  presentationOptions?: {
    title?: string;
    width?: number;
  };
};
