import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { PackageAlertSummary } from "@/services/dependencyAlerts";
import { useState } from "react";
import { useI18n } from "@/hooks/useI18n";

interface PackageAlertsTableProps {
  packageSummaries: PackageAlertSummary[];
  title?: string;
}

function getSeverityClass(severity: string): string {
  const severityClasses: Record<string, string> = {
    critical: "bg-red-900 text-white hover:bg-red-900",
    high: "bg-orange-600 text-white hover:bg-orange-600",
    medium: "bg-yellow-600 text-white hover:bg-yellow-600",
    low: "bg-blue-500 text-white hover:bg-blue-500",
  };
  return severityClasses[severity.toLowerCase()] || "bg-gray-500";
}

export default function PackageAlertsTable({ packageSummaries, title }: PackageAlertsTableProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const displayTitle = title ?? t("components:dependencyAlerts.alertsByPackage");

  if (packageSummaries.length === 0) {
    return null;
  }

  // Sort by violations descending
  const sortedSummaries = [...packageSummaries].sort((a, b) => b.violations - a.violations);

  const headers = [
    { title: t("components:dependencyAlerts.tableHeaders.package"), key: "package" },
    { title: t("components:dependencyAlerts.tableHeaders.totalAlerts"), key: "totalAlerts" },
    { title: t("components:dependencyAlerts.tableHeaders.openAlerts"), key: "openAlerts" },
    { title: t("components:dependencyAlerts.tableHeaders.severityBreakdown"), key: "severity" },
    { title: t("components:dependencyAlerts.tableHeaders.violations"), key: "violations" },
    { title: t("components:dependencyAlerts.tableHeaders.repositories"), key: "repositories" },
  ];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4 rounded-lg border">
      <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between p-4 text-lg font-semibold">
        <span>{displayTitle}</span>
        <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180 transform" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header) => (
                  <TableHead key={header.key}>{header.title}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSummaries.map((item, index) => (
                <TableRow key={`${item.package}-${index}`}>
                  <TableCell className="font-medium">{item.package}</TableCell>
                  <TableCell>{item.totalAlerts}</TableCell>
                  <TableCell>{item.openAlerts}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.criticalCount > 0 && (
                        <Badge className={getSeverityClass("critical")} variant="secondary">
                          {item.criticalCount}
                        </Badge>
                      )}
                      {item.highCount > 0 && (
                        <Badge className={getSeverityClass("high")} variant="secondary">
                          {item.highCount}
                        </Badge>
                      )}
                      {item.mediumCount > 0 && (
                        <Badge className={getSeverityClass("medium")} variant="secondary">
                          {item.mediumCount}
                        </Badge>
                      )}
                      {item.lowCount > 0 && (
                        <Badge className={getSeverityClass("low")} variant="secondary">
                          {item.lowCount}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.violations > 0 ? <Badge variant="destructive">{item.violations}</Badge> : <span>0</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.repositories.map((repo) => (
                        <Badge key={repo} variant="outline" className="text-xs">
                          {repo}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
