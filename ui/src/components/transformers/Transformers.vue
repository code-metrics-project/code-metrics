<template>
  <v-expansion-panels v-if="transformerMap && transformerMap.size" class="mb-5" inset :disabled="busy">
    <v-expansion-panel>
      <v-expansion-panel-title class="font-weight-bold">
        <span><v-icon class="mr-2">mdi-tune</v-icon> Transformers</span>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-card-text
          >Apply transformations to the data received back from the query.
          <strong>These transforms are applied cumulatively.</strong></v-card-text
        >
        <v-tabs v-model="tab" background-color="transparent">
          <v-tab v-for="[key] in Array.from(transformerMap)" :key="key">
            {{ key }}
          </v-tab>
        </v-tabs>

        <v-window v-model="tab" background-color="transparent">
          <v-window-item v-for="[key, transformers] in Array.from(transformerMap)" :key="key">
            <div
              v-for="(configuredTransformer, index) in transformState[key]"
              class="transformer-row"
              :key="configuredTransformer.id"
            >
              <div class="controls">
                <v-combobox
                  v-model="configuredTransformer.transform"
                  :items="
                    transformers.map(({ disabled, id, subtitle, title }) => ({
                      props: { disabled, subtitle },
                      title,
                      value: id,
                    }))
                  "
                  :label="transformerLabel(index)"
                  :return-object="false"
                  dense
                  outlined
                />

                <v-btn icon @click.prevent="removeTransformer(key, index)" elevation="2">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </div>

              <component
                v-if="configuredTransformer.transform"
                :is="transformers.find((t) => t.id === configuredTransformer.transform)?.component"
                v-model="configuredTransformer.args"
                @update:model-value="onInputChange"
              />

              <v-divider />
            </div>

            <v-card-actions>
              <v-btn @click.prevent="appendTransformer(key)" text="true">+ Add transformer</v-btn>
            </v-card-actions>
          </v-window-item>
        </v-window>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from "vue";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_QUERY_TRANSFORMER_MAP } from "./transform";
import { QueryName } from "@/queries/queries";
import { OperationState } from "@/utils/ui";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInitialState(transformerMap: Map<string, any>, currentState: Record<string, any> = {}) {
  const state = { ...currentState };
  for (const [key] of transformerMap) {
    state[key] = state[key] || [];
  }
  return state;
}

type Props = {
  operationState?: OperationState;
  queries: QueryName[];
};

const props = defineProps<Props>();
const emit = defineEmits(["input"]);

const transformerMap = computed(
  () => new Map([...DEFAULT_QUERY_TRANSFORMER_MAP].filter(([queryName]) => props.queries.includes(queryName))),
);

const transformState = ref(getInitialState(transformerMap.value));

watch(
  () => props.queries,
  () => {
    transformState.value = getInitialState(transformerMap.value, transformState.value);
  },
);

function addTransformer(queryName: QueryName) {
  transformState.value[queryName].push({
    id: uuidv4(),
    transform: null,
    args: [],
  });
}

function deleteTransformer(queryName: QueryName, transformerIndex: number) {
  transformState.value[queryName].splice(transformerIndex, 1);
}

function appendTransformer(queryName: string) {
  addTransformer(queryName as QueryName);
}

function removeTransformer(queryName: string, transformerIndex: string | number) {
  deleteTransformer(queryName as QueryName, Number(transformerIndex));
}

function transformerLabel(transformerIndex: string | number) {
  return `Choose transformer ${Number(transformerIndex) + 1}`;
}

function onInputChange() {
  emit("input", transformState.value);
}

const tab = ref();
const busy = computed(() => props.operationState === OperationState.Busy);
</script>

<style scoped>
.card {
  margin: 32px 0 64px;
}

.controls {
  display: flex;
  gap: 16px;
}

.add-button {
  margin: 16px;
}

.transformer-row {
  padding: 16px;
}
</style>
