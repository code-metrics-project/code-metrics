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

  <v-container v-if="isError">
    <v-row>
      <v-col>
        <v-alert :text="(error || '').toString()" type="error" />
      </v-col>
    </v-row>
  </v-container>

  <v-container fluid v-if="isLoading">
    <v-row :cols="12" :sm="6" :md="4" :lg="3" :xl="2">
      <v-col :cols="12" :sm="6" :xl="4">
        <v-skeleton-loader class="mx-auto border" type="image, article"></v-skeleton-loader>
      </v-col>
      <v-col :cols="12" :sm="6" :xl="4">
        <v-skeleton-loader class="mx-auto border" type="image, article"></v-skeleton-loader>
      </v-col>
      <v-col :cols="12" :sm="6" :xl="4">
        <v-skeleton-loader class="mx-auto border" type="image, article"></v-skeleton-loader>
      </v-col>
      <v-col :cols="12" :sm="6" :xl="4">
        <v-skeleton-loader class="mx-auto border" type="image, article"></v-skeleton-loader>
      </v-col>
      <v-col :cols="12" :sm="6" :xl="4">
        <v-skeleton-loader class="mx-auto border" type="image, article"></v-skeleton-loader>
      </v-col>
      <v-col :cols="12" :sm="6" :xl="4">
        <v-skeleton-loader class="mx-auto border" type="image, article"></v-skeleton-loader>
      </v-col>
    </v-row>
  </v-container>

  <v-container fluid v-if="data?.length">
    <v-row :cols="12" :sm="6" :md="4" :lg="3" :xl="2">
      <template v-for="(workload, workloadIndex) in data" :key="workloadIndex">
        <v-col
          v-for="(repoGroup, repoGroupIndex) in workload.repoGroups"
          :key="repoGroupIndex"
          :cols="12"
          :sm="6"
          :xl="4"
        >
          <v-card>
            <v-sheet :color="convertVariantToColour(repoGroup.headline.variant)">
              <v-card-title class="white--text">{{ workload.workloadId }} / {{ repoGroup.repoGroup }}</v-card-title>
            </v-sheet>

            <div>
              <v-card-title class="text-h4">
                <template v-if="repoGroup.headline.denominator > 0"
                  >{{ repoGroup.headline.numerator }} of {{ repoGroup.headline.denominator }} implemented</template
                >
                <template v-else>No data</template>
              </v-card-title>

              <div v-if="repoGroup.headline.missing > 0">
                <v-card-subtitle>{{ repoGroup.headline.missing }} repo(s) missing data</v-card-subtitle>
              </div>
            </div>

            <v-card-text>
              <span class="text--secondary">Number of repos: </span>
              <strong>{{ repoGroup.repos.length }}</strong>
            </v-card-text>

            <v-card-actions>
              <v-btn text="Details"></v-btn>

              <v-spacer></v-spacer>

              <v-btn
                :icon="
                  openDetails.has(`${workload.workloadId}-${repoGroup.repoGroup}`)
                    ? 'mdi-chevron-up'
                    : 'mdi-chevron-down'
                "
                @click="
                  openDetails.has(`${workload.workloadId}-${repoGroup.repoGroup}`)
                    ? openDetails.delete(`${workload.workloadId}-${repoGroup.repoGroup}`)
                    : openDetails.add(`${workload.workloadId}-${repoGroup.repoGroup}`)
                "
              ></v-btn>
            </v-card-actions>

            <v-expand-transition>
              <div v-show="openDetails.has(`${workload.workloadId}-${repoGroup.repoGroup}`)">
                <v-divider></v-divider>

                <v-card-text>
                  <v-data-table
                    :headers="REPO_COLUMN_HEADERS"
                    :items="getQualityGateSummaries(repoGroup.repos)"
                    :items-per-page="-1"
                    :loading="isLoading"
                    hide-default-footer
                    item-value="id"
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
                      <p v-else>{{ internalItem.raw.message }}</p>
                    </template>

                    <template v-slot:item.repo="{ item }">
                      <a :href="item.repoLink" target="_BLANK">{{ item.repo }}</a>
                    </template>

                    <template v-slot:item.qualityGates="{ item }">
                      <v-chip
                        v-if="item.qualityGates"
                        v-for="qualityGateName in Object.keys(item.qualityGates)"
                        :append-icon="
                          hasQualityGate(item.qualityGates[qualityGateName])
                            ? 'mdi-clipboard-check'
                            : 'mdi-clipboard-text-off-outline'
                        "
                        :color="hasQualityGate(item.qualityGates[qualityGateName]) ? 'green' : 'red'"
                        class="ma-1"
                        size="x-small"
                        variant="outlined"
                        >{{ capitalize(qualityGateName) }}</v-chip
                      >
                    </template>

                    <template v-slot:expanded-row="{ columns, item }">
                      <tr>
                        <td :colspan="columns.length" class="py-2">
                          <v-sheet rounded="lg" border>
                            <v-table v-if="item.qualityGates" density="compact">
                              <tbody class="bg-surface-light">
                                <tr>
                                  <th />
                                  <th
                                    v-for="qualityGateName in Object.values(item.qualityGates)[0].map((qg) => qg.phase)"
                                  >
                                    {{ capitalize(qualityGateName) }}
                                  </th>
                                </tr>
                              </tbody>

                              <tbody>
                                <tr v-for="[qualityGateName, qualityGatePhases] in Object.entries(item.qualityGates)">
                                  <td>{{ capitalize(qualityGateName) }}</td>
                                  <td v-for="phase in qualityGatePhases" class="quality-gate-details-cell">
                                    <dl class="quality-gate-details" v-for="job in phase.gates">
                                      <div>
                                        <dt>Provider:</dt>
                                        <dd>{{ job.provider }}</dd>
                                      </div>
                                      <div>
                                        <dt>File:</dt>
                                        <dd>
                                          <a :href="job.config.fileURL">{{ job.config.file }}</a>
                                        </dd>
                                      </div>
                                      <div>
                                        <dt>Path:</dt>
                                        <dd>{{ job.config.path }}</dd>
                                      </div>
                                      <div>
                                        <dt>Enforced:</dt>
                                        <dd>
                                          <v-icon
                                            color="primary"
                                            :icon="getRequiredStatusCheckIcon(job.isRequiredStatusCheck)"
                                          ></v-icon>
                                        </dd>
                                      </div>
                                    </dl>
                                  </td>
                                </tr>
                              </tbody>
                            </v-table>
                            <div v-else>{{ item.message }}</div>
                          </v-sheet>
                        </td>
                      </tr>
                    </template>
                  </v-data-table>
                </v-card-text>
              </div>
            </v-expand-transition>
          </v-card>
        </v-col>
      </template>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { capitalize, remove } from "lodash";
import { Paths } from "@/router/paths";
import { useQualityGates, type TGate, type TPhase, type TRepo } from "@/vue-queries/qualityGates";
import { convertVariantToColour } from "@/utils/colours";

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

const openDetails = ref(new Set());

const { data, error, isError, isLoading } = useQualityGates({
  workloads: workloadId.value ? [workloadId.value] : [],
});

type FormattedData = {
  id: string;
  message: string;
  service?: string;
  repo: string;
  repoLink: string;
  qualityGates?: TGate;
}[];

const getQualityGateSummaries = (repos: TRepo[]) => {
  if (!repos) return undefined;
  const fd: FormattedData = [];
  repos.forEach((manifest) => {
    if (!manifest.services || !manifest.services.length) {
      fd.push({
        id: manifest.repo || "",
        message: !manifest.services
          ? "No manifest found in this repo."
          : "No service in the manifest matches this repo group.",
        repo: manifest.repo || "",
        repoLink: manifest.repoLink || "",
      });
      return;
    }

    manifest.services.forEach((manifestService) => {
      fd.push({
        id: `${manifestService["service-tag"]}-${manifest.repo}`,
        message: "Success",
        service: manifestService["service-tag"],
        repo: manifest.repo || "",
        repoLink: manifest.repoLink || "",
        qualityGates: manifestService["quality-gates"],
      });
    });
  });

  return fd;
};

const REPO_COLUMN_HEADERS = [
  {
    title: "Repo",
    key: "repo",
  },
  {
    title: "Quality Gates",
    key: "qualityGates",
  },
];

function getRequiredStatusCheckIcon(isRequiredStatusCheck?: boolean) {
  if (isRequiredStatusCheck === true) return "mdi-shield-check";
  if (isRequiredStatusCheck === false) return "mdi-shield-off-outline";
  return "mdi-shield-alert-outline";
}

function hasQualityGate(qualityGate: TPhase[]) {
  return !!qualityGate.find((qg) => qg.gates.length);
}
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
