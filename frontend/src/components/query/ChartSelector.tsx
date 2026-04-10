import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart3, LineChart, PieChart, Table2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

// eslint-disable-next-line react-refresh/only-export-components
export enum ChartType {
  ColumnChart = "ColumnChart",
  DoughnutChart = "DoughnutChart",
  MultiChart = "MultiChart",
  DataTable = "DataTable",
}

interface ChartTypeMetadata {
  chartType: ChartType;
  nameKey: string;
  icon: typeof BarChart3;
}

const chartTypes: ChartTypeMetadata[] = [
  {
    chartType: ChartType.MultiChart,
    nameKey: "components:charts.lineChart",
    icon: LineChart,
  },
  {
    chartType: ChartType.ColumnChart,
    nameKey: "components:charts.columnChart",
    icon: BarChart3,
  },
  {
    chartType: ChartType.DoughnutChart,
    nameKey: "components:charts.doughnutChart",
    icon: PieChart,
  },
  {
    chartType: ChartType.DataTable,
    nameKey: "components:charts.table",
    icon: Table2,
  },
];

export interface ChartSelectorProps {
  value: ChartType;
  onChange: (chartType: ChartType) => void;
  disabled?: boolean;
  className?: string;
}

export function ChartSelector({ value, onChange, disabled = false, className }: ChartSelectorProps) {
  const { t } = useI18n();

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <span className="text-muted-foreground text-sm">{t("components:charts.chartType")}</span>
      <div className="bg-muted/30 flex items-center gap-1 rounded-lg p-1">
        <TooltipProvider>
          {chartTypes.map((ct) => {
            const Icon = ct.icon;
            const isActive = ct.chartType === value;
            return (
              <Tooltip key={ct.chartType}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={disabled}
                    className={`focus-visible:ring-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    } `}
                    onClick={() => onChange(ct.chartType)}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{t(ct.nameKey)}</TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
}
