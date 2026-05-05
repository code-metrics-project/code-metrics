<template>
  <section v-if="!dismissed" class="frontend-upgrade-banner" aria-live="polite" data-testid="frontend-upgrade-banner">
    <div class="frontend-upgrade-banner__content">
      <div class="frontend-upgrade-banner__copy">
        <p class="frontend-upgrade-banner__eyebrow">New frontend app available!</p>
        <p class="frontend-upgrade-banner__message">This Classic UI will no longer receive feature updates.</p>
        <a
          class="frontend-upgrade-banner__link"
          href="https://github.com/code-metrics-project/releases/releases"
          target="_blank"
          rel="noopener noreferrer"
        >
          Update your CodeMetrics deployment to use the new frontend app
        </a>
      </div>

      <button
        type="button"
        class="frontend-upgrade-banner__dismiss"
        aria-label="Dismiss new frontend application banner"
        data-testid="frontend-upgrade-banner-dismiss"
        @click="dismissBanner"
      >
        Dismiss
      </button>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { ref } from "vue";

const DISMISSED_STORAGE_KEY = "codemetrics.classic-ui.frontend-upgrade-banner.dismissed.v1";

function loadDismissedState() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(DISMISSED_STORAGE_KEY) === "true";
}

const dismissed = ref(loadDismissedState());

function dismissBanner() {
  dismissed.value = true;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, "true");
  }
}
</script>

<style scoped>
.frontend-upgrade-banner {
  border-left: 4px solid rgb(var(--v-theme-warning));
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 16%, transparent);
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 0;
}

.frontend-upgrade-banner__content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  width: min(100%, 1400px);
  margin: 0 auto;
  padding: 4px 8px;
}

.frontend-upgrade-banner__copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.frontend-upgrade-banner__eyebrow {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: rgb(var(--v-theme-warning));
  text-transform: uppercase;
}

.frontend-upgrade-banner__message {
  margin: 0;
  font-size: 0.94rem;
  line-height: 1.35;
}

.frontend-upgrade-banner__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  color: inherit;
  font-size: 0.94rem;
  line-height: 1.3;
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 0.2em;
}

.frontend-upgrade-banner__link::after {
  content: "↗";
  font-size: 0.8em;
}

.frontend-upgrade-banner__link:hover,
.frontend-upgrade-banner__link:focus-visible {
  opacity: 0.85;
}

.frontend-upgrade-banner__dismiss {
  flex: 0 0 auto;
  align-self: center;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid color-mix(in srgb, currentColor 55%, transparent);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}

.frontend-upgrade-banner__dismiss:hover,
.frontend-upgrade-banner__dismiss:focus-visible {
  background: color-mix(in srgb, currentColor 12%, transparent);
  outline: none;
}

@media (max-width: 959px) {
  .frontend-upgrade-banner__content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 2px 0;
  }

  .frontend-upgrade-banner__dismiss {
    align-self: flex-start;
  }
}
</style>
