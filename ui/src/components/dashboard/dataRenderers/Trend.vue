<template>
  <div>
    <h2 class="trend-title">Week ending</h2>
    <div class="trend-row">
      <div
        :class="`trend-col${index === formattedData.length - 1 ? ' current' : ''}`"
        v-for="(period, index) in formattedData"
        :key="period.endDate"
      >
        <h3 class="week-date">
          {{
            new Date(period.endDate).toLocaleDateString("en-GB", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          }}
        </h3>
        <hr />
        <div>
          <p v-if="index > 0" class="trend-diff">
            <v-icon v-if="period.change > 0" color="green darken-2" size="48"> mdi-triangle-small-up </v-icon>
            <v-icon v-if="period.change < 0" color="red darken-2" size="48"> mdi-triangle-small-down </v-icon>
            <v-icon v-if="period.change === 0" color="blue-lighten-2" size="24" class="nochange-indicator">
              mdi-equal
            </v-icon>
            {{ period.change > 0 ? "+" : "" }}{{ Math.round(period.change * 100) / 100 }}
          </p>
          <p>
            {{ Math.round(period.value * 100) / 100 }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import type { DatedMetrics } from "@/model/metrics";
import { getRollingAverages } from "@/utils/rollingAverages";

type Props = {
  data: Map<string, DatedMetrics>;
};

const props = defineProps<Props>();

const formattedData = computed(() => {
  const BUCKET_SIZE = 7;
  const averages = getRollingAverages(props.data, BUCKET_SIZE);
  const last4Items = [...averages].slice(0, 4);
  const formattedForUI = last4Items
    .filter((item) => item[1].entries.size > 0)
    .map((item) => {
      const [name, metric] = item[1].entries.entries().next().value as unknown as [
        string,
        { date: string; value: number }[],
      ];
      return {
        name: name,
        endDate: metric[0]?.date,
        value: metric[0]?.value,
      };
    })
    .reverse()
    .map((item, index, arr) => {
      return {
        ...item,
        change: index !== 0 ? item.value - arr[index - 1].value : 0,
      };
    });
  return formattedForUI;
});
</script>

<style lang="scss" scoped>
.trend-title {
  font-size: 10px;
  line-height: 1;
  margin-bottom: 4px;
}

.trend-row {
  display: flex;
  justify-content: space-between;
}

.trend-col {
  background-color: #00000010;
  border-radius: 4px;
  font-size: 10px;
  padding: 4px 8px;
  position: relative;
}

.trend-diff {
  font-size: 8px;
  left: -3px;
  line-height: 1;
  position: absolute;
  transform: translate(-100%, 100%);

  .v-icon {
    left: 50%;
    position: absolute;
    transform: translate(-50%, -100%);
  }
  .nochange-indicator {
    transform: translate(-80%, -150%);
  }
}

.week-date {
  font-size: 1em;
}

.current {
  font-size: 1.4em;
  font-weight: 700;
  width: 35%;
}
</style>
