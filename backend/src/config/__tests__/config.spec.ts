import { clearCachedConfig, getConfig, loadConfig, mergeConfigs, readConfig } from "../config";
import path from "path";

import { WorkloadConfigWrapper, WorkloadTicketConfigJira } from "../../model/config/workload-config";
import { RemoteConfigWrapper } from "../../model/config/remote-config";
import { StageConfigWrapper } from "../../model/config/pipeline-config";

describe("readConfig", () => {
  it("should parse the JSON config", async () => {
    const config: WorkloadConfigWrapper = await readConfig(
      [path.join(__dirname, "test-data/json")],
      "workload-config",
      {
        required: true,
      },
    );
    expect(config).toBeTruthy();
    expect(config.workloads).toHaveLength(1);
    expect(config.workloads[0].codeAnalysis.mappings).toHaveLength(1);
  });

  it("should parse the YAML workload config", async () => {
    const config: WorkloadConfigWrapper = await readConfig(
      [path.join(__dirname, "test-data/yaml")],
      "workload-config",
      {
        required: true,
      },
    );
    expect(config).toBeTruthy();
    expect(config.workloads).toHaveLength(1);
    expect(config.workloads[0].codeAnalysis.mappings).toHaveLength(1);
  });

  it("should parse the YAML remote config", async () => {
    const config: RemoteConfigWrapper = await readConfig([path.join(__dirname, "test-data/yaml")], "remote-config", {
      required: true,
    });
    expect(config).toBeTruthy();
    expect(config.codeAnalysis).toBeTruthy();
    expect(config.codeManagement).toBeTruthy();
    expect(config.ticketManagement).toBeTruthy();
  });

  it("should parse the YAML pipeline config", async () => {
    const config: StageConfigWrapper = await readConfig([path.join(__dirname, "test-data/yaml")], "pipeline-config", {
      required: true,
    });
    expect(config).toBeTruthy();
    expect(config.stages).toBeTruthy();
    expect(config.stages).toHaveLength(1);
  });

  it("should fail to load a nonexistent required file", async () => {
    await expect(
      readConfig([path.join(__dirname, "test-data")], "does-not-exist", { required: true }),
    ).rejects.toThrow();
  });

  it("should ignore failure to load a nonexistent non-required file", async () => {
    // failure to load should not throw as the config is not 'required'
    await readConfig([path.join(__dirname, "test-data")], "does-not-exist", { required: false });
  });

  it("should apply defaults", async () => {
    clearCachedConfig();
    await loadConfig({ dir: path.join(__dirname, "test-data/defaults") });
    const config = getConfig();
    expect(config).toBeTruthy();

    // workload bug types should be loaded from remote config
    const projectManagement = config.workloadConfigs.workloads[0].projectManagement as WorkloadTicketConfigJira;
    expect(projectManagement.ticketTypes).toHaveLength(1);
    expect(projectManagement.ticketTypes[0]).toBe("Bug");
  });

  it("should load multiple config files", async () => {
    const config: WorkloadConfigWrapper = await readConfig(
      [path.join(__dirname, "test-data/multiple")],
      "workload-config",
      { required: true },
    );
    expect(config).toBeTruthy();
    expect(config.workloads).toHaveLength(2);
  });
});

describe("mergeConfigs", () => {
  type TestConfig = {
    root: { prop: string }[];
    optionalKey?: string[];
  };

  it("should merge configs", () => {
    const configs: TestConfig[] = [{ root: [{ prop: "foo" }] }, { root: [{ prop: "bar" }] }];
    const merged = mergeConfigs(configs);
    expect(merged).not.toBeNull();
    expect(merged.root).toHaveLength(2);
    expect(merged.root[0].prop).toBe("foo");
    expect(merged.root[1].prop).toBe("bar");
    expect(merged.optionalKey).toBeUndefined();
  });

  it("should merge configs with different keys", () => {
    const configs: TestConfig[] = [{ root: [{ prop: "foo" }], optionalKey: ["baz"] }, { root: [{ prop: "bar" }] }];
    const merged = mergeConfigs(configs);
    expect(merged).not.toBeNull();
    expect(merged.root).toHaveLength(2);
    expect(merged.root[0].prop).toBe("foo");
    expect(merged.root[1].prop).toBe("bar");
    expect(merged.optionalKey).toBeDefined();
  });

  it("should merge configs when configs are arrays", () => {
    type ArrayItem = {
      id: string;
      value: string;
      nested?: {
        property: string;
      };
    };

    const config1: ArrayItem[] = [
      { id: "item1", value: "value1" },
      { id: "item2", value: "value2", nested: { property: "prop2" } },
    ];

    const config2: ArrayItem[] = [
      { id: "item3", value: "value3" },
      { id: "item4", value: "value4", nested: { property: "prop4" } },
    ];

    const merged = mergeConfigs<ArrayItem[]>([config1, config2]);

    expect(Array.isArray(merged)).toBe(true);
    expect(merged).toHaveLength(4);
    expect(merged[0].id).toBe("item1");
    expect(merged[1].id).toBe("item2");
    expect(merged[1].nested.property).toBe("prop2");
    expect(merged[2].id).toBe("item3");
    expect(merged[3].id).toBe("item4");
    expect(merged[3].nested.property).toBe("prop4");
  });
});
