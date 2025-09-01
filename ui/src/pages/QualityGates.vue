<template>
  <v-sheet color="accent">
    <v-container>
      <v-row>
        <v-col class="pb-8">
          <v-breadcrumbs :items="items"></v-breadcrumbs>
          <h2 class="text-h2">{{ $t("nav.qualityGates") }}</h2>
          <p class="text-body-1 py-1">
            Quality Gates are automated checks ensuring code meets quality standards before progressing to higher
            environments. These gates, configured per service and repository, verify successful test completion, code
            analysis, and security scans, ensuring only high-quality code reaches production.
          </p>
        </v-col>
      </v-row>
    </v-container>
  </v-sheet>

  <v-container>
    <v-row>
      <v-col>
        <v-text-field
          v-model="search"
          label="Search"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          hide-details
          single-line
        ></v-text-field>

        <v-data-table
          :headers="columnHeaders"
          :items="formattedData"
          :items-per-page="100"
          :loading="isLoading"
          item-value="id"
          :search="search"
          show-expand
        >
          <template v-slot:item.data-table-expand="{ internalItem, isExpanded, toggleExpand }">
            <v-btn
              v-if="internalItem.raw.service"
              :append-icon="isExpanded(internalItem) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              :text="isExpanded(internalItem) ? 'Collapse' : 'More info'"
              class="text-none"
              color="medium-emphasis"
              size="small"
              variant="text"
              width="105"
              border
              slim
              @click="toggleExpand(internalItem)"
            ></v-btn>
            <p v-else>No manifest found.</p>
          </template>

          <template v-slot:item.repo="{ item }">
            <a :href="item.repoLink" target="_BLANK">{{ item.repo }}</a>
          </template>

          <template v-slot:item.qualityGates="{ item }">
            <v-chip
              v-if="item.qualityGates"
              v-for="qualityGateName in allQualityGates"
              :append-icon="
                !!item.qualityGates[qualityGateName] ? 'mdi-clipboard-check' : 'mdi-clipboard-text-off-outline'
              "
              :color="!!item.qualityGates[qualityGateName] ? 'green' : 'red'"
              class="ma-1"
              variant="outlined"
              >{{ capitalize(qualityGateName) }}</v-chip
            >
          </template>

          <template v-slot:expanded-row="{ columns, item }">
            <tr>
              <td :colspan="columns.length" class="py-2">
                <v-sheet rounded="lg" border>
                  <v-table density="compact">
                    <tbody class="bg-surface-light">
                      <tr>
                        <th v-for="qualityGateName in allQualityGates">{{ capitalize(qualityGateName) }}</th>
                      </tr>
                    </tbody>

                    <tbody>
                      <tr>
                        <td class="quality-gate-details-cell" v-for="qualityGateName in allQualityGates">
                          <dl class="quality-gate-details" v-for="job in item.qualityGates?.[qualityGateName]">
                            <div>
                              <dt>Provider:</dt>
                              <dd>{{ job.provider }}</dd>
                            </div>
                            <div>
                              <dt>Phase:</dt>
                              <dd>{{ job.phase }}</dd>
                            </div>
                            <div>
                              <dt>File:</dt>
                              <dd>
                                <a :href="item.repoLink + '/' + job.file">{{ job.file }}</a>
                              </dd>
                            </div>
                            <div>
                              <dt>Path:</dt>
                              <dd>{{ job.path }}</dd>
                            </div>
                            <div>
                              <dt>Required:</dt>
                              <dd>
                                <v-icon
                                  color="primary"
                                  :icon="job.isRequiredStatusCheck ? 'mdi-shield-check' : 'mdi-shield-off-outline'"
                                ></v-icon>
                              </dd>
                            </div>
                          </dl>
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-sheet>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { capitalize } from "lodash";
import { Paths } from "@/router/paths";
import { useQualityGates } from "@/vue-queries/qualityGates";

const route = useRoute();
const { t } = useI18n();

const workloadId = computed(() => {
  if (!route.params.workloadId) return;
  if (Array.isArray(route.params.workloadId)) return route.params.workloadId[0];
  return route.params.workloadId;
});

const items = workloadId.value
  ? [
      {
        title: "Workloads",
        to: Paths.Workloads,
      },
      {
        title: capitalize(workloadId.value),
        to: `${Paths.Workloads}/${workloadId.value}`,
      },
      {
        title: t("nav.qualityGates"),
        to: `${Paths.Workloads}/${workloadId.value}`,
      },
    ]
  : [
      {
        title: t("nav.program"),
        to: Paths.Program,
      },
      {
        title: t("nav.qualityGates"),
        to: Paths.ProgramQualityGates,
      },
    ];

const search = ref("");

const { data, isLoading } = useQualityGates({
  workloads: workloadId.value ? [workloadId.value] : [],
});

type TQualityGates = {
  [key: string]: {
    file: string;
    path: string;
    phase: string;
    provider: string;
    isRequiredStatusCheck: boolean;
  }[];
};

type FormattedData = {
  id: string;
  schema?: string;
  service?: string;
  repo: string;
  repoLink: string;
  qualityGates?: TQualityGates;
}[];

const formattedData = computed(() => {
  if (!data.value) return undefined;
  const fd: FormattedData = [];
  data.value.forEach((manifest) => {
    if (!manifest.services) {
      fd.push({
        id: manifest.repo || "",
        repo: manifest.repo || "",
        repoLink: manifest.repoLink || "",
      });
      return;
    }

    manifest.services.forEach((manifestService) => {
      const qualityGates: TQualityGates = {};

      manifestService["quality-gates"].forEach((qualityGate) => {
        qualityGate["check-types"].forEach((checkType) => {
          qualityGates[checkType] = qualityGates[checkType] || [];
          qualityGates[checkType].push({
            file: qualityGate.config.file,
            path: qualityGate.config.path,
            phase: qualityGate.phase,
            provider: qualityGate.provider,
            isRequiredStatusCheck: qualityGate.isRequiredStatusCheck ?? false,
          });
        });
      });

      fd.push({
        id: `${manifestService["service-tag"]}-${manifest.repo}`,
        schema: manifest.$schema,
        service: manifestService["service-tag"],
        repo: manifest.repo || "",
        repoLink: manifest.repoLink || "",
        qualityGates,
      });
    });
  });
  return fd;
});

const columnHeaders = [
  {
    title: "Service",
    key: "service",
  },
  {
    title: "Repo",
    key: "repo",
  },
  {
    title: "Quality Gates",
    key: "qualityGates",
  },
];

const allQualityGates = computed(() => {
  if (!formattedData.value) return undefined;

  return [
    ...formattedData.value.reduce((headers, fd) => {
      if (!fd.qualityGates) return headers;

      Object.keys(fd.qualityGates).forEach((key) => {
        headers.add(key);
      });
      return headers;
    }, new Set<string>()),
  ].sort((a, b) => (a > b ? 1 : -1));
});
</script>

<style lang="scss" scoped>
.quality-gate-details-cell {
  vertical-align: top;
}

.quality-gate-details {
  font-size: 12px;
  margin-bottom: 8px;

  & > div {
    display: flex;
    gap: 4px;
  }

  & dd {
    font-weight: 700;
  }
}
</style>
