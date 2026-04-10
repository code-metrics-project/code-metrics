import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportDatasetAsLocalFile } from "@/utils/download";

export interface DataTableColumn {
  key: string;
  label: string;
  format?: (value: unknown) => string;
}

export interface DataTableData {
  columns: DataTableColumn[];
  rows: Record<string, unknown>[];
}

export interface DataTableProps {
  chartData: DataTableData;
  className?: string;
  showExport?: boolean;
}

export function DataTable({ chartData, className, showExport = false }: DataTableProps) {
  const handleExportCsv = () => {
    // Convert rows to use column labels as keys and apply formatting
    const exportData = chartData.rows.map((row) => {
      const exportRow: Record<string, string> = {};
      for (const col of chartData.columns) {
        const value = row[col.key];
        exportRow[col.label] = col.format ? col.format(value) : String(value ?? "");
      }
      return exportRow;
    });
    exportDatasetAsLocalFile(exportData);
  };

  return (
    <div className={className}>
      {showExport && chartData.rows.length > 0 && (
        <div className="mb-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Download as CSV
          </Button>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            {chartData.columns.map((col) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {chartData.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {chartData.columns.map((col) => (
                <TableCell key={col.key}>
                  {col.format ? col.format(row[col.key]) : String(row[col.key] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {chartData.rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={chartData.columns.length} className="text-muted-foreground py-8 text-center">
                No data available.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
