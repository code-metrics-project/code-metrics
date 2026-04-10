import { useRef, type ReactNode } from "react";
import { ChartExportButton } from "./ChartExportButton";

interface ChartWithExportProps {
  title: string;
  children: ReactNode;
  showExport?: boolean;
}

export function ChartWithExport({ title, children, showExport = true }: ChartWithExportProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {showExport && <ChartExportButton chartTitle={title} />}
      </div>
      <div ref={chartRef} className="w-full">
        {children}
      </div>
    </div>
  );
}
