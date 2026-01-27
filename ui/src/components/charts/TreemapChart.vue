<template>
  <div>
    <apexchart
      width="100%"
      :height="height"
      type="treemap"
      :options="options"
      :series="series"
      @dataPointSelection="onDataPointClick"
    />

    <!-- Dialog for showing issue links -->
    <v-dialog v-model="dialogOpen" max-width="500">
      <v-card>
        <v-card-title class="text-h6">
          {{ selectedData?.x }}
        </v-card-title>
        <v-card-subtitle v-if="selectedData?.meta?.fullPath">
          {{ selectedData.meta.fullPath }}
        </v-card-subtitle>
        <v-card-text>
          <div class="mb-3">
            <strong>{{ selectedData?.y }}</strong> issue-related changes
          </div>
          <div class="mb-3"><strong>Coverage:</strong> {{ selectedData?.meta?.coverage || "-" }}</div>
          <div>
            <strong>Related Issues:</strong>
            <v-list density="compact" v-if="selectedData?.meta?.issueLinks?.length">
              <v-list-item
                v-for="link in selectedData.meta.issueLinks"
                :key="link.id"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                <template #prepend>
                  <v-icon size="small">mdi-open-in-new</v-icon>
                </template>
                <v-list-item-title>{{ link.id }}</v-list-item-title>
              </v-list-item>
            </v-list>
            <div v-else class="text-grey">No linked issues</div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogOpen = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
import type { ApexOptions } from "apexcharts";
import { computed, ref } from "vue";
import { useTheme } from "vuetify";
import { getThemeString } from "@/plugins/vuetify";

export type IssueLink = {
  id: string;
  url: string;
};

export type TreemapDataItem = {
  x: string;
  y: number;
  meta?: {
    fullPath?: string;
    coverage?: string;
    issueIds?: string[];
    issueLinks?: IssueLink[];
  };
};

export type TreemapSeriesItem = {
  name: string;
  data: TreemapDataItem[];
};

type Props = {
  series: TreemapSeriesItem[];
  height?: number | string;
  chartOptions?: ApexOptions;
  colorScale?: {
    ranges: Array<{
      from: number;
      to: number;
      color: string;
    }>;
  };
};

const props = withDefaults(defineProps<Props>(), {
  height: 400,
  chartOptions: undefined,
  colorScale: undefined,
});

const theme = useTheme();

// Dialog state for showing issue details on click
const dialogOpen = ref(false);
const selectedData = ref<TreemapDataItem | null>(null);

function onDataPointClick(
  _event: MouseEvent,
  _chartContext: unknown,
  config: { seriesIndex: number; dataPointIndex: number },
) {
  const dataPoint = props.series[config.seriesIndex]?.data[config.dataPointIndex];
  if (dataPoint) {
    selectedData.value = dataPoint;
    dialogOpen.value = true;
  }
}

// Compute dynamic color ranges based on actual data values
const dynamicColorRanges = computed(() => {
  if (props.colorScale?.ranges) {
    return props.colorScale.ranges;
  }

  // Find the max value across all data points
  let maxVal = 0;
  for (const s of props.series) {
    for (const d of s.data) {
      if (d.y > maxVal) maxVal = d.y;
    }
  }

  // Create 3 ranges: 0-33%, 33-66%, 66-100% of max
  const third = Math.ceil(maxVal / 3);
  const twoThirds = Math.ceil((maxVal * 2) / 3);

  return [
    { from: 0, to: third, color: "#F9A825" }, // Amber/Gold - low heat (readable with white text)
    { from: third + 1, to: twoThirds, color: "#FF7043" }, // Deep Orange - medium heat
    { from: twoThirds + 1, to: maxVal + 1, color: "#D32F2F" }, // Red - high heat
  ];
});

const options = computed(() => {
  const opts: ApexOptions = {
    chart: {
      type: "treemap",
      toolbar: {
        show: true,
      },
    },
    legend: {
      show: false,
    },
    plotOptions: {
      treemap: {
        distributed: false,
        enableShades: false,
        colorScale: {
          ranges: dynamicColorRanges.value,
        },
      },
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: "12px",
      },
      formatter: function (text: string, op: { value: number; seriesIndex: number; dataPointIndex: number; w: any }) {
        const data = op.w.config.series[op.seriesIndex].data[op.dataPointIndex];
        const coverage = data?.meta?.coverage;
        const lines = [text, `Changes: ${op.value}`];
        if (coverage) {
          lines.push(`Coverage: ${coverage}`);
        }
        return lines;
      },
    },
    tooltip: {
      custom: function ({ seriesIndex, dataPointIndex, w }) {
        const data = w.config.series[seriesIndex].data[dataPointIndex];
        const meta = data.meta || {};
        const issueCount = meta.issueLinks?.length || 0;

        return `
          <div style="padding: 10px; font-size: 13px;">
            <div><strong>${data.x}</strong></div>
            <div style="margin-top: 4px; color: #666; font-size: 11px;">${meta.fullPath || ""}</div>
            <div style="margin-top: 8px;">
              <strong>${data.y}</strong> issue-related changes
            </div>
            <div style="margin-top: 4px;">Coverage: ${meta.coverage || "-"}</div>
            <div style="margin-top: 4px;">${issueCount} linked issue${issueCount !== 1 ? "s" : ""}</div>
            <div style="margin-top: 8px; color: #1976d2; font-size: 11px;">Click to view issue links</div>
          </div>
        `;
      },
    },
    theme: {
      mode: getThemeString(theme),
    },
    ...props.chartOptions,
  };
  return opts;
});
</script>
