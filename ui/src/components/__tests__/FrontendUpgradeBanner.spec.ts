import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import FrontendUpgradeBanner from "../FrontendUpgradeBanner.vue";

const DISMISSED_STORAGE_KEY = "codemetrics.classic-ui.frontend-upgrade-banner.dismissed.v1";

function mountBanner() {
  return mount(FrontendUpgradeBanner, {
    global: {
      stubs: {
        "v-alert": {
          template: "<div><slot /></div>",
        },
      },
    },
  });
}

describe("FrontendUpgradeBanner", () => {
  beforeEach(() => {
    window.localStorage.removeItem(DISMISSED_STORAGE_KEY);
  });

  it("renders the upgrade message and release link by default", () => {
    const wrapper = mountBanner();

    expect(wrapper.get('[data-testid="frontend-upgrade-banner"]').text()).toContain(
      "This Classic UI will no longer receive feature updates.",
    );

    const link = wrapper.get("a");
    expect(link.text()).toContain("Update your CodeMetrics deployment to use the new frontend app");
    expect(link.attributes("href")).toBe("https://github.com/code-metrics-project/releases/releases");
  });

  it("hides the banner after dismissal and persists that choice", async () => {
    const wrapper = mountBanner();

    await wrapper.get('[data-testid="frontend-upgrade-banner-dismiss"]').trigger("click");

    expect(window.localStorage.getItem(DISMISSED_STORAGE_KEY)).toBe("true");
    expect(wrapper.find('[data-testid="frontend-upgrade-banner"]').exists()).toBe(false);
  });

  it("starts hidden when already dismissed in local storage", () => {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, "true");

    const wrapper = mountBanner();

    expect(wrapper.find('[data-testid="frontend-upgrade-banner"]').exists()).toBe(false);
  });
});
