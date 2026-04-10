import { cn } from "@/lib/utils";
import type { Dashboard as TDashboard } from "@/queries/useDashboards";
import { DashboardCard } from "./DashboardCard";

// Use explicit class names so Tailwind can detect them at build time
const columnClasses: Record<number, string> = {
  1: "col-span-12 md:col-span-1",
  2: "col-span-12 md:col-span-2",
  3: "col-span-12 md:col-span-3",
  4: "col-span-12 md:col-span-4",
  5: "col-span-12 md:col-span-5",
  6: "col-span-12 md:col-span-6",
  7: "col-span-12 md:col-span-7",
  8: "col-span-12 md:col-span-8",
  9: "col-span-12 md:col-span-9",
  10: "col-span-12 md:col-span-10",
  11: "col-span-12 md:col-span-11",
  12: "col-span-12 md:col-span-12",
};

function getColumnClass(width?: number): string {
  if (!width || !columnClasses[width]) return "col-span-12";
  return columnClasses[width];
}

interface DashboardProps {
  dashboard: TDashboard;
  className?: string;
}

export function Dashboard({ dashboard, className }: DashboardProps) {
  return (
    <div className={cn("grid grid-cols-12 gap-6", className)}>
      {dashboard.data.map((item) => (
        <div key={item.id} className={getColumnClass(item.presentationOptions?.width)}>
          <DashboardCard
            dataSource={item.dataSource}
            dataView={item.dataView}
            presentationOptions={item.presentationOptions}
          />
        </div>
      ))}
    </div>
  );
}
