import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type GroupByDimension = "workloadId" | "repoGroup" | "tag" | "jobGroup";

export interface QueryGroupProps {
  dimensions: GroupByDimension[];
  value?: GroupByDimension;
  onChange: (dimension: GroupByDimension) => void;
  disabled?: boolean;
}

const dimensionLabelKeys: Record<GroupByDimension, string> = {
  workloadId: "components:inputs.dimensions.workload",
  repoGroup: "components:inputs.dimensions.repositoryGroup",
  tag: "components:inputs.dimensions.tag",
  jobGroup: "components:inputs.dimensions.jobGroup",
};

export function QueryGroup({ dimensions, value, onChange, disabled = false }: QueryGroupProps) {
  const { t } = useTranslation();
  if (dimensions.length === 0) {
    return null;
  }

  return (
    <div className="my-4">
      <Label htmlFor="group-by-select" className="mb-2 block">
        {t("components:inputs.groupBy")}
      </Label>
      <Select value={value} onValueChange={onChange as (value: string) => void} disabled={disabled}>
        <SelectTrigger id="group-by-select" className="w-62.5">
          <SelectValue placeholder={t("components:inputs.selectGrouping")} />
        </SelectTrigger>
        <SelectContent>
          {dimensions.map((dimension) => (
            <SelectItem key={dimension} value={dimension}>
              {t(dimensionLabelKeys[dimension])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
