import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Copy, Check } from "lucide-react";
import { exportChartAsPNG, copyChartToClipboard } from "@/utils/chartExport";
import { useI18n } from "@/hooks/useI18n";

interface ChartExportButtonProps {
  chartTitle: string;
}

export function ChartExportButton({ chartTitle }: ChartExportButtonProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExportPNG = () => {
    if (chartRef.current) {
      exportChartAsPNG(chartRef.current, chartTitle);
    }
  };

  const handleCopyToClipboard = async () => {
    if (chartRef.current) {
      try {
        await copyChartToClipboard(chartRef.current);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy to clipboard:", error);
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          {t("components:charts.export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPNG}>
          <span>{t("components:charts.exportPng")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyToClipboard}>
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              <span>{t("components:charts.copied")}</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>{t("components:charts.copyToClipboard")}</span>
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
