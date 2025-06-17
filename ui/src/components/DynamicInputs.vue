<template>
  <v-container fluid class="px-0 py-0">
    <v-row v-if="queryTypes?.length">
      <v-col class="pb-0 mb-2">
        <v-menu v-model="addFilterOpen">
          <template v-slot:activator="{ props }">
            <v-btn
              name="add-filter"
              class="mb-3"
              v-bind="props"
              :disabled="busy"
              >Add filter
              <v-icon>mdi-filter-outline</v-icon>
            </v-btn>
          </template>

          <v-list v-if="availableInputs.length !== selectedInputs.length">
            <v-list-item
              v-for="input in availableInputs.filter(
                (input) => !selectedInputs.includes(input.inputType),
              )"
              :key="input.inputType"
              @click="addInput(input)"
            >
              <v-list-item-title>{{ input.label }}</v-list-item-title>
            </v-list-item>
          </v-list>
          <v-list v-else>
            <v-list-item disabled>
              <v-list-item-title
                ><v-icon icon="mdi-information" /> You've already added all the
                filters for these queries.</v-list-item-title
              >
            </v-list-item>
          </v-list>
        </v-menu>
      </v-col>
    </v-row>

    <v-row class="my-1" v-for="(input, index) in inputs" :key="index">
      <v-col
        cols="11"
        sm="10"
        md="8"
        lg="6"
        class="border-dotted border-thin ms-3"
      >
        <Component
          :is="input.component"
          v-bind="input.props"
          :operationState="operationState"
          @input="(value) => onSetInputValue(input.inputType, value)"
          @update:modelValue="
            (value) => onSetInputValue(input.inputType, value)
          "
        />
      </v-col>
      <v-col cols="1">
        <v-btn
          class="ml-0 center"
          @click="deleteInput(index)"
          :disabled="busy"
          icon="mdi-delete-forever"
          variant="flat"
        />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" sm="10" md="8" lg="6" class="py-0">
        <slot name="inputs" />
      </v-col>
    </v-row>

    <v-row>
      <v-col class="py-0">
        <Transformers
          v-if="queryTypes?.length"
          :queries="queryTypes"
          @input="onTransformInput"
          :operationState="operationState"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col sm="6">
        <v-btn
          name="runQuery"
          color="primary"
          @click.prevent="execute"
          :disabled="busy || !queryTypes?.length"
        >
          {{ runLabel }}
        </v-btn>
        <slot name="buttons" />

        <v-menu open-on-hover v-if="!!$slots.menuItems">
          <template v-slot:activator="{ props }">
            <v-btn
              name="queryMenu"
              class="ml-2"
              variant="outlined"
              color="primary"
              density="compact"
              v-bind="props"
              icon="mdi-menu-down"
            />
          </template>
          <v-list>
            <slot name="menuItems" />
          </v-list>
        </v-menu>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
// @ts-nocheck
import { type Component, computed, onMounted, ref, watch } from "vue";
import { QueryName } from "@/queries/queries";
import { OperationState } from "@/utils/ui";
import Transformers from "./transformers/Transformers.vue";
import { getInputTypes } from "@/queries/config";
import IssueFilter from "@/components/inputs/IssueFilter.vue";
import WorkloadNames from "@/components/inputs/WorkloadNames.vue";
import { logger } from "@/utils/logger";
import {
  getDefaultValue,
  InputType,
  isPopulatedInputValue,
} from "@/queries/inputs";
import PipelineOptions from "@/components/inputs/PipelineOptions.vue";
import PipelineActors from "@/components/inputs/PipelineActors.vue";
import RepoGroups from "@/components/inputs/RepoGroups.vue";
import JobGroups from "@/components/inputs/JobGroups.vue";
import BranchNames from "@/components/inputs/BranchNames.vue";
import { type RawQuery } from "@/model/query";
import { useI18n } from "vue-i18n";
import DateInput from "@/components/inputs/DateInput.vue";
import { toStoredQueryCollection } from "@/queries/summary";
import TagInput from "@/components/inputs/TagInput.vue";
import SeverityOptions from "@/components/inputs/SeverityOptions.vue";
import PipelineStage from "@/components/inputs/PipelineStage.vue";

type ComponentAndProps = {
  component: Component;
  props?: Record<string, any>;
};

type InputAndDefaults = {
  inputType: InputType;
  component: Component;
  props?: Record<string, any>;
};

type Props = {
  hideInputs?: InputType[];
  queryName: string;
  queryTypes: QueryName[];
  defaultInputs?: Record<string, any>;
  operationState?: OperationState;
  executeOnMount?: boolean;
};

type InputItem = {
  inputType: InputType;
  label: string;
};

const { t } = useI18n();

const InputMap = new Map<InputType, ComponentAndProps>([
  [InputType.BRANCH_NAMES, { component: BranchNames }],
  [
    InputType.END_DATE,
    { component: DateInput, props: { label: "End date", argName: "endDate" } },
  ],
  [InputType.ISSUE_FILTER, { component: IssueFilter }],
  [
    InputType.INCIDENT_FILTER,
    { component: IssueFilter, props: { filters: ["priority"] } },
  ],
  [InputType.PIPELINE_OPTIONS, { component: PipelineOptions }],
  [InputType.PIPELINE_ACTOR_TYPE, { component: PipelineActors }],
  [InputType.PIPELINE_STAGE, { component: PipelineStage }],
  [InputType.REPO_GROUPS, { component: RepoGroups }],
  [InputType.JOB_GROUPS, { component: JobGroups }],
  [InputType.SEVERITY_OPTIONS, { component: SeverityOptions }],
  [InputType.START_DATE, { component: DateInput }],
  [InputType.TAGS, { component: TagInput }],
  [InputType.WORKLOAD_NAMES, { component: WorkloadNames }],
]);

const props = defineProps<Props>();
const emit = defineEmits(["execute", "input", "updateQuery"]);

const busy = computed(() => props.operationState === OperationState.Busy);
const addFilterOpen = ref(false);

const inputValues = ref<Record<string, any>>({});
const transformConfig = ref({});

const availableInputs = computed<InputItem[]>(() => {
  return getInputTypes(props.queryTypes)
    .filter((input) => !props.hideInputs?.includes(input))
    .map((inputType) => ({
      inputType,
      label: t(`inputs.${inputType}`),
    }));
});

/**
 * If defaults are provided for an input type, add it to the initially
 * selected inputs. This is used when displaying saved queries to determine
 * which inputs should be initially displayed.
 */
const determineSelectedInputsFromDefaults = () => {
  const selectedInputs: InputType[] = [];
  for (const { inputType } of availableInputs.value) {
    if (isPopulatedInputValue(props.defaultInputs?.[inputType])) {
      selectedInputs.push(inputType);
    }
  }
  return selectedInputs;
};

const selectedInputs = ref<InputType[]>(determineSelectedInputsFromDefaults());

const inputs = computed<InputAndDefaults[]>(() =>
  getInputComponents(
    props.queryTypes.length ? selectedInputs.value : [],
    props.defaultInputs || {},
  ),
);

const runLabel = computed(() => {
  switch (props.operationState) {
    case OperationState.Idle:
      return `Run query`;
    case OperationState.Busy:
      return `Running query...`;
    case OperationState.Error:
    default:
      return "Error";
  }
});

const populatedQueries = ref<RawQuery[]>([]);

const addInput = (item: InputItem) => {
  selectedInputs.value.push(item.inputType);
};

const deleteInput = (index: number) => {
  const deleted = selectedInputs.value.splice(index, 1);
  deleted.forEach((inputType) => {
    onSetInputValue(inputType, undefined);
  });
};

function getInputComponents(
  inputTypes: InputType[],
  defaultInputs: Record<string, any>,
) {
  const components: InputAndDefaults[] = [];
  for (const inputType of inputTypes) {
    const componentAndProps = InputMap.get(inputType) as ComponentAndProps;
    if (!componentAndProps) {
      continue;
    }
    const mergedProps = {
      ...componentAndProps.props,
      defaults: defaultInputs[inputType],
    };
    components.push({
      inputType,
      component: componentAndProps.component,
      props: mergedProps,
    });
  }
  return components;
}

const onTransformInput = (newTransformConfig) => {
  transformConfig.value = newTransformConfig;
  populate();
};

const populateDefaults = (inputs: Record<string, any>): Record<string, any> => {
  const populated = { ...inputs };
  for (const { inputType } of availableInputs.value) {
    if (populated[inputType] === undefined) {
      populated[inputType] = props.defaultInputs?.[inputType]
        ? props.defaultInputs[inputType]
        : getDefaultValue(inputType);
    }
  }
  return populated;
};

const populateRawQueries = (inputArgs: Record<string, any>) => {
  const queries: RawQuery[] = props.queryTypes
    .map((queryName) => {
      const baseQuery = {
        queryName,
        args: inputArgs,
      };

      const transformerQueries = transformConfig.value[queryName]
        ? transformConfig.value[queryName].map(({ args, transform }) => ({
            queryName,
            args: inputArgs,
            transforms: [
              {
                transform,
                args,
              },
            ],
          }))
        : [];

      return [baseQuery, ...transformerQueries];
    })
    .flat();
  return queries;
};

const onSetInputValue = (inputType: InputType, value: any) => {
  inputValues.value[inputType] = value;
  populate();
};

const populate = () => {
  const inputs = populateDefaults(inputValues.value);
  emit("input", inputs);

  populatedQueries.value = populateRawQueries(inputs);

  const collection = toStoredQueryCollection(props.queryTypes, inputs, t);
  emit("updateQuery", collection);
};

watch(
  () => props.queryTypes,
  () => populate(),
);

const execute = () => {
  const inputArgs = populatedQueries.value;
  logger(`Execute query: ${props.queryName} with args:`, inputArgs);
  emit("execute", inputArgs);
};

onMounted(() => {
  populate();

  if (props.executeOnMount) {
    execute();
  }
});
</script>
