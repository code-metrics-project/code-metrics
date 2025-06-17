<template>
  <div>
    <v-menu
      ref="menu"
      v-model="datePickerMenuOpen"
      :close-on-content-click="false"
      transition="scale-transition"
      offset-y
      min-width="auto"
    >
      <template v-slot:activator="{ props }">
        <v-text-field
          v-model="formattedDate"
          :label="label"
          prepend-icon="mdi-calendar"
          readonly
          v-bind="props"
          :disabled="busy"
          hide-details
        ></v-text-field>
      </template>

      <v-sheet width="360">
        <v-date-picker
          :disabled="busy"
          no-title
          scrollable
          show-adjacent-months
          @update:model-value="datePickerMenuOpen = false"
          v-model="date"
        >
        </v-date-picker>

        <v-container>
          <v-row justify="center" align="center">
            <v-col>
              <v-btn
                size="x-small"
                color="secondary"
                @click="() => setRelativeDate(-7)"
                >7 days ago</v-btn
              >
            </v-col>
            <v-col>
              <v-btn
                size="x-small"
                color="secondary"
                @click="() => setRelativeDate(-30)"
                >30 days ago</v-btn
              >
            </v-col>
            <v-col>
              <v-btn
                size="x-small"
                color="secondary"
                @click="() => setRelativeDate(-90)"
                >90 days ago</v-btn
              >
            </v-col>
          </v-row>
        </v-container>
      </v-sheet>
    </v-menu>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import { formatISO } from "date-fns";
import { OperationState } from "@/utils/ui";
import { getOffsetDate } from "@/utils/date";
import { getDefaultValue, InputType } from "@/queries/inputs";

type TProps = {
  modelValue?: Date;
  label?: string;
  argName?: string;
  operationState?: OperationState;
};

const props = withDefaults(defineProps<TProps>(), {
  modelValue: () => new Date(getDefaultValue<string>(InputType.START_DATE)),
  label: () => "Start date",
  argName: () => "startDate",
  operationState: OperationState.Idle,
});
const emit = defineEmits(["update:modelValue"]);

const date = ref<Date>(new Date(props.modelValue));
const datePickerMenuOpen = ref(false);

const formattedDate = computed(() => {
  return formatISO(date.value, { representation: "date" });
});

const busy = computed(() => props.operationState === OperationState.Busy);

onMounted(() => {
  emit(
    "update:modelValue",
    formatISO(date.value, {
      representation: "date",
    }),
  );
});

watch(date, function (modelValue) {
  emit("update:modelValue", formatISO(modelValue, { representation: "date" }));
});

function setRelativeDate(dayOffset: number) {
  date.value = getOffsetDate(dayOffset);
  datePickerMenuOpen.value = false;
}
</script>
