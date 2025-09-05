<template>
  <v-card-subtitle class="pl-0 mb-2">Pipeline actor type</v-card-subtitle>
  <v-select
    v-model="actorType"
    :items="actorTypeItems"
    :disabled="busy"
    item-text="title"
    item-value="value"
    label="Select"
    persistent-hint
    single-line
    hide-details
  ></v-select>
</template>

<script lang="ts">
import { OperationState } from "@/utils/ui";
import { ActorType, getDefaultValue, InputType } from "@/queries/inputs";

export default {
  props: {
    operationState: {
      type: Number as () => OperationState,
      default: () => OperationState.Idle,
    },
  },

  created() {
    this.$emit("input", this.actorType);
  },

  data() {
    return {
      actorType: getDefaultValue<ActorType>(InputType.PIPELINE_ACTOR_TYPE),
      actorTypeItems: [
        { title: "All", value: ActorType.All },
        { title: "User", value: ActorType.User },
        { title: "Bot", value: ActorType.Bot },
        { title: "Organization", value: ActorType.Organization },
        { title: "App", value: ActorType.App },
      ],
    };
  },

  computed: {
    busy(): boolean {
      return this.operationState === OperationState.Busy;
    },
  },

  watch: {
    actorType: function (value) {
      this.$emit("input", value);
    },
  },
};
</script>
