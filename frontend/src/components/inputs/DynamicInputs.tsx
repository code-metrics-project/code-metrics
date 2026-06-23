import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, Info, Trash2, Loader2 } from "lucide-react";
import { WorkloadNames } from "./WorkloadNames";
import { RepoGroups } from "./RepoGroups";
import { BranchNames } from "./BranchNames";
import { JobGroups } from "./JobGroups";
import { JobNames } from "./JobNames";
import { PipelineActors } from "./PipelineActors";
import { PipelineStage } from "./PipelineStage";
import { SeverityOptions } from "./SeverityOptions";
import { IssueFilter } from "./IssueFilter";
import { TagInput } from "./TagInput";
import { StartDatePicker } from "./StartDatePicker";
import { EndDatePicker } from "./EndDatePicker";
import type { RawQuery, GroupBy } from "@/model/query";
import type { ConfiguredTransformer } from "@/components/transformers/transform";
import { getOffsetDate, truncateDateOnly } from "@/utils/date";
import { getInputTypesForQueries } from "@/queries/queryInputs";
import { InputType } from "./inputTypes";

// Re-export InputType for backwards compatibility
export { InputType } from "./inputTypes";

export interface QueryArgs {
  workloads?: string[];
  repoGroups?: string[];
  branchNames?: string[];
  startDate?: string;
  endDate?: string;
  stageId?: string;
  jobGroups?: string[];
  jobNames?: string[];
  tags?: string[];
  issueFilter?: Record<string, unknown>;
  incidentFilter?: Record<string, unknown>;
  actorType?: string;
  severityOptions?: Record<string, unknown>;
}

interface InputConfig {
  inputType: InputType;
  labelKey: string;
  component: React.ComponentType<{
    defaults?: unknown;
    disabled?: boolean;
    onChange?: (value: unknown) => void;
  }>;
  defaultValue: () => unknown;
}

const inputConfigs: InputConfig[] = [
  {
    inputType: InputType.WORKLOAD_NAMES,
    labelKey: "components:inputs.labels.workloads",
    component: WorkloadNames as InputConfig["component"],
    defaultValue: () => [],
  },
  {
    inputType: InputType.REPO_GROUPS,
    labelKey: "components:inputs.labels.repositoryGroups",
    component: RepoGroups as InputConfig["component"],
    defaultValue: () => [],
  },
  {
    inputType: InputType.BRANCH_NAMES,
    labelKey: "components:inputs.labels.branches",
    component: BranchNames as InputConfig["component"],
    defaultValue: () => [],
  },
  {
    inputType: InputType.JOB_GROUPS,
    labelKey: "components:inputs.labels.jobGroups",
    component: JobGroups as InputConfig["component"],
    defaultValue: () => [],
  },
  {
    inputType: InputType.JOB_NAMES,
    labelKey: "components:inputs.labels.jobNames",
    component: JobNames as InputConfig["component"],
    defaultValue: () => [],
  },
  {
    inputType: InputType.START_DATE,
    labelKey: "components:inputs.labels.startDate",
    component: StartDatePicker as InputConfig["component"],
    defaultValue: () => truncateDateOnly(getOffsetDate(-30)),
  },
  {
    inputType: InputType.END_DATE,
    labelKey: "components:inputs.labels.endDate",
    component: EndDatePicker as InputConfig["component"],
    defaultValue: () => truncateDateOnly(new Date()),
  },
  {
    inputType: InputType.PIPELINE_ACTOR_TYPE,
    labelKey: "components:inputs.labels.pipelineActor",
    component: PipelineActors as InputConfig["component"],
    defaultValue: () => "all",
  },
  {
    inputType: InputType.PIPELINE_STAGE,
    labelKey: "components:inputs.labels.pipelineStage",
    component: PipelineStage as InputConfig["component"],
    defaultValue: () => "",
  },
  {
    inputType: InputType.SEVERITY_OPTIONS,
    labelKey: "components:inputs.labels.severity",
    component: SeverityOptions as InputConfig["component"],
    defaultValue: () => ({ splitBySeverity: false }),
  },
  {
    inputType: InputType.ISSUE_FILTER,
    labelKey: "components:inputs.labels.issueFilters",
    component: IssueFilter as InputConfig["component"],
    defaultValue: () => ({}),
  },
  {
    inputType: InputType.INCIDENT_FILTER,
    labelKey: "components:inputs.labels.incidentFilters",
    component: ({ defaults, disabled, onChange }) => (
      <IssueFilter
        defaults={defaults as Record<string, string>}
        disabled={disabled}
        filters={["priority"]}
        onChange={onChange as (value: Record<string, string>) => void}
      />
    ),
    defaultValue: () => ({}),
  },
  {
    inputType: InputType.TAGS,
    labelKey: "components:inputs.labels.tags",
    component: TagInput as InputConfig["component"],
    defaultValue: () => [],
  },
];

export interface DynamicInputsProps {
  queryTypes: string[];
  queryName: string;
  defaultInputs?: QueryArgs;
  hideInputs?: InputType[];
  isBusy?: boolean;
  executeOnMount?: boolean;
  onInput?: (args: QueryArgs) => void;
  onExecute?: (queries: RawQuery[]) => void;
  stackInputs?: boolean; // If true, stack inputs vertically instead of using grid layout
  children?: React.ReactNode; // Content to render between filters and the Run Query button (e.g., GroupBy, Transformers)
  groupBy?: GroupBy; // Optional groupBy dimension to include in queries
  transforms?: Record<string, ConfiguredTransformer[]>; // Optional transforms per query
}

export function DynamicInputs({
  queryTypes,
  queryName: _queryName,
  defaultInputs = {},
  hideInputs = [],
  isBusy = false,
  executeOnMount = false,
  onInput,
  onExecute,
  stackInputs = false,
  children,
  groupBy,
  transforms = {},
}: DynamicInputsProps) {
  void _queryName; // Used for display/debugging purposes
  const { t } = useTranslation();

  // Compute available inputs based on query types - only show inputs required by selected queries
  // This matches Vue's getInputTypes(queryTypes) behavior
  const availableInputs = useMemo(() => {
    if (queryTypes.length === 0) return [];

    const requiredInputTypes = getInputTypesForQueries(queryTypes);
    return inputConfigs.filter(
      (config) => requiredInputTypes.includes(config.inputType) && !hideInputs.includes(config.inputType)
    );
  }, [queryTypes, hideInputs]);

  // Use lazy initialization for state - runs only once on mount
  const [inputValues, setInputValues] = useState<QueryArgs>(() => {
    const initialValues: QueryArgs = { ...defaultInputs };
    return initialValues;
  });

  const [selectedInputs, setSelectedInputs] = useState<InputType[]>(() => {
    // Only show inputs that have populated default values (non-empty arrays, non-empty objects, etc.)
    // This matches Vue's determineSelectedInputsFromDefaults behavior
    const initialSelected: InputType[] = [];
    for (const [key, value] of Object.entries(defaultInputs)) {
      // Check if value is "populated" - not just defined but has actual content
      const isPopulated =
        value !== undefined &&
        value !== null &&
        !(Array.isArray(value) && value.length === 0) &&
        !(typeof value === "object" && Object.keys(value).length === 0);
      if (isPopulated) {
        initialSelected.push(key as InputType);
      }
    }
    return initialSelected;
  });

  const [addFilterOpen, setAddFilterOpen] = useState(false);

  // Track if we've executed on mount (for executeOnMount prop)
  const hasExecutedOnMount = useRef(false);

  // Store latest callback ref to avoid stale closures (updated synchronously each render)
  const onExecuteRef = useRef(onExecute);
  useEffect(() => {
    onExecuteRef.current = onExecute;
  });

  const unselectedInputs = useMemo(() => {
    return availableInputs.filter((config) => !selectedInputs.includes(config.inputType));
  }, [availableInputs, selectedInputs]);

  const handleInputChange = useCallback(
    (inputType: InputType, value: unknown) => {
      setInputValues((prev) => {
        const updated = { ...prev, [inputType]: value };
        onInput?.(updated);
        return updated;
      });
    },
    [onInput]
  );

  const addInput = useCallback((config: InputConfig) => {
    setSelectedInputs((prev) => [...prev, config.inputType]);
    setAddFilterOpen(false);
    // Initialize the input value with its default if not already set
    setInputValues((prev) => {
      const key = config.inputType as keyof QueryArgs;
      if (prev[key] === undefined) {
        return { ...prev, [key]: config.defaultValue() };
      }
      return prev;
    });
  }, []);

  const deleteInput = useCallback((index: number) => {
    setSelectedInputs((prev) => {
      const updated = [...prev];
      const removed = updated.splice(index, 1)[0];
      setInputValues((prevValues) => {
        const newValues = { ...prevValues };
        delete newValues[removed as keyof QueryArgs];
        return newValues;
      });
      return updated;
    });
  }, []);

  // Execute function that reads current state via functional updates
  const execute = useCallback(() => {
    // Get current input values synchronously
    let currentInputValues: QueryArgs = {};
    setInputValues((prev) => {
      currentInputValues = prev;
      return prev; // No state change, just reading
    });

    const baseDefaults: QueryArgs = inputConfigs.reduce((acc, ic) => {
      return {
        ...acc,
        [ic.inputType]: ic.defaultValue(),
      };
    }, {});

    // Get the required input types for the current query types
    const requiredInputTypes = getInputTypesForQueries(queryTypes);

    const mergedArgs = Object.fromEntries(
      requiredInputTypes.map((k) => [k, currentInputValues[k] ?? defaultInputs[k] ?? baseDefaults[k]])
    );

    const queries: RawQuery[] = queryTypes.map((queryName) => {
      // Filter out transforms with null transform type and convert to RawQuery format
      const queryTransforms = transforms[queryName]
        ?.filter((t) => t.transform !== null)
        .map((t) => ({
          transform: t.transform as unknown as import("@/model/query").TransformTypes,
          args: t.args,
        }));
      return {
        queryName,
        args: mergedArgs,
        ...(groupBy ? { groupBy } : {}),
        ...(queryTransforms && queryTransforms.length > 0 ? { transforms: queryTransforms } : {}),
      };
    });
    onExecuteRef.current?.(queries);
  }, [queryTypes, defaultInputs, groupBy, transforms]);

  // Execute on mount if requested (only once) - use flag to avoid setState in effect
  useEffect(() => {
    if (executeOnMount && !hasExecutedOnMount.current) {
      hasExecutedOnMount.current = true;
      // Use setTimeout to execute after render is complete
      setTimeout(() => execute(), 0);
    }
  }, [executeOnMount, execute]);

  return (
    <div className="space-y-4 pt-2">
      {/* Filters section */}
      {queryTypes.length > 0 && (
        <div className="space-y-3">
          {/* Add filter button */}
          <Popover open={addFilterOpen} onOpenChange={setAddFilterOpen}>
            <PopoverTrigger asChild>
              <Button name="add-filter" variant="outline" size="sm" disabled={isBusy}>
                <Filter className="mr-2 h-4 w-4" />
                {t("components:inputs.addFilter")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start" sideOffset={8}>
              {unselectedInputs.length > 0 ? (
                <div className="max-h-75 space-y-1 overflow-y-auto">
                  {unselectedInputs.map((config) => (
                    <Button
                      key={config.inputType}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => addInput(config)}
                    >
                      {t(config.labelKey)}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground flex items-center gap-2 p-2 text-sm">
                  <Info className="h-4 w-4" />
                  {t("components:inputs.allFiltersAdded")}
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Active filters - stacked vertically with reasonable max width */}
          {selectedInputs.length > 0 && (
            <div className={stackInputs ? "space-y-3" : "max-w-2xl space-y-3"}>
              {selectedInputs.map((inputType, index) => {
                const config = inputConfigs.find((c) => c.inputType === inputType);
                if (!config) return null;
                const Component = config.component;
                const defaultValue = inputValues[inputType as keyof QueryArgs] ?? config.defaultValue();

                return (
                  <div key={inputType} className="flex items-start gap-2">
                    <div className="bg-muted/30 border-border/50 flex-1 rounded-lg border p-3">
                      <Component
                        defaults={defaultValue}
                        disabled={isBusy}
                        onChange={(value) => handleInputChange(inputType, value)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => deleteInput(index)}
                      disabled={isBusy}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Additional content (GroupBy, Transformers, etc.) */}
      {children}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-4">
        <Button name="runQuery" variant="default" onClick={execute} disabled={isBusy || queryTypes.length === 0}>
          {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isBusy ? t("components:inputs.runningQuery") : t("components:inputs.runQuery")}
        </Button>
      </div>
    </div>
  );
}
