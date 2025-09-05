<template>
  <v-btn
    color="grey-darken-1"
    density="compact"
    variant="text"
    :href="repoUrl"
    target="_blank"
    icon="mdi-source-repository"
    class="mr-1"
  />
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { getUrlForRepo } from "@/utils/config";

type TProps = {
  repoName: string;
  workloadId: string;
};

const props = withDefaults(defineProps<TProps>(), {
  repoName: () => "",
  workloadId: () => "",
});

const repoUrl = ref<string>(getUrlForRepo(props.workloadId, props.repoName));
</script>
