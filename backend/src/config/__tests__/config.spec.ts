import { clearCachedConfig, getConfig, loadConfig, mergeConfigs, readConfig, testables } from "../config";
import path from "path";

import { WorkloadConfigWrapper, WorkloadTicketConfigJira } from "../../model/config/workload-config";
import { RemoteConfigWrapper, AuthMethod } from "../../model/config/remote-config";
import { StageConfigWrapper } from "../../model/config/pipeline-config";
import { ConfigHolder, TicketManagementTypes } from "../../model/config/common";
import { ConfigVersion } from "../../model/config/base";

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
    expect(config.workloads.length).toBeGreaterThanOrEqual(1);

    // Find the original athena workload
    const athenaWorkload = config.workloads.find((w) => w.id === "athena");
    expect(athenaWorkload).toBeDefined();
    expect(athenaWorkload?.codeAnalysis.mappings).toHaveLength(1);
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

  it("should parse GitHub workload configuration", async () => {
    const config: WorkloadConfigWrapper = await readConfig(
      [path.join(__dirname, "test-data/yaml")],
      "workload-config-github",
      { required: true },
    );
    expect(config).toBeTruthy();
    expect(config.workloads).toHaveLength(1);

    const workload = config.workloads[0];
    expect(workload.id).toBe("github-test-workload");
    expect(workload.projectManagement.type).toBe("github");
    expect(workload.incidents.type).toBe("github");

    // Validate GitHub-specific configuration
    const projectMgmt = workload.projectManagement as any;
    expect(projectMgmt.owner).toBe("test-org");
    expect(projectMgmt.repo).toBe("project-issues");
    expect(projectMgmt.ticketTypes).toContain("bug");
    expect(projectMgmt.ticketTypes).toContain("feature");
    expect(projectMgmt.stateFilter).toBe("all");
    expect(projectMgmt.labelMapping).toBeDefined();

    const incidents = workload.incidents as any;
    expect(incidents.owner).toBe("test-org");
    expect(incidents.repo).toBe("incidents");
    expect(incidents.ticketTypes).toContain("incident");
  });

  it("should parse GitHub remote configuration", async () => {
    const config: RemoteConfigWrapper = await readConfig([path.join(__dirname, "test-data/yaml")], "remote-config", {
      required: true,
    });
    expect(config).toBeTruthy();
    expect(config.ticketManagement.github).toBeDefined();
    expect(config.ticketManagement.github?.servers).toHaveLength(1);

    const githubServer = config.ticketManagement.github?.servers[0];
    expect(githubServer?.id).toBe("example-github");
    expect(githubServer?.url).toBe("https://api.github.com");
    expect(githubServer?.authMethod).toBe("BEARER_TOKEN");

    const defaults = githubServer?.defaults as any;
    expect(defaults.owner).toBe("example-org");
    expect(defaults.repo).toBe("example-repo");
    expect(defaults.ticketTypes).toContain("bug");
    expect(defaults.ticketTypes).toContain("feature");
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

  it("should replace scalar values when merging", () => {
    type ScalarConfig = {
      email: string;
      key: string;
    };

    const configs: ScalarConfig[] = [
      { email: "first@example.com", key: "first-token" },
      { email: "second@example.com", key: "second-token" },
    ];

    const merged = mergeConfigs(configs);

    expect(merged.email).toBe("second@example.com");
    expect(merged.key).toBe("second-token");
    expect(typeof merged.key).toBe("string");
  });
});

describe("applyWorkloadDefaults", () => {
  const { applyWorkloadDefaults } = testables;

  it("should apply project management defaults from remote config", () => {
    const config: ConfigHolder = {
      metadata: { name: "test", version: "1.0.0" },
      remoteConfigs: {
        version: ConfigVersion.V2_0,
        codeAnalysis: {},
        codeManagement: {},
        pipelines: {},
        ticketManagement: {
          jira: {
            servers: [
              {
                id: "jira-server-1",
                url: "https://jira.example.com",
                apiKey: "secret",
                authMethod: AuthMethod.BEARER_TOKEN,
                defaults: {
                  projectName: "DEFAULT",
                  ticketTypes: ["Bug", "Story"],
                  ticketPriorities: ["High", "Medium"],
                },
              },
            ],
          },
        },
      },
      workloadConfigs: { version: ConfigVersion.V2_0, workloads: [] },
      pipelineConfigs: { stages: [] },
      qualityGatesConfigs: { "quality-gates": [] },
    };

    const workload: any = {
      id: "test-workload",
      projectManagement: {
        type: TicketManagementTypes.JIRA,
        serverId: "jira-server-1",
        projectName: "TEST",
      },
    };

    applyWorkloadDefaults(config, workload);

    expect(workload.projectManagement.ticketTypes).toEqual(["Bug", "Story"]);
    expect(workload.projectManagement.ticketPriorities).toEqual(["High", "Medium"]);
  });

  it("should apply incident management defaults from remote config", () => {
    const config: ConfigHolder = {
      metadata: { name: "test", version: "1.0.0" },
      remoteConfigs: {
        version: ConfigVersion.V2_0,
        codeAnalysis: {},
        codeManagement: {},
        pipelines: {},
        ticketManagement: {
          jira: {
            servers: [
              {
                id: "jira-incident-server",
                url: "https://jira.example.com",
                apiKey: "secret",
                authMethod: AuthMethod.BEARER_TOKEN,
                defaults: {
                  projectName: "DEFAULT",
                  ticketTypes: ["Incident", "Problem"],
                  ticketPriorities: ["Critical", "High"],
                },
              },
            ],
          },
        },
      },
      workloadConfigs: { version: ConfigVersion.V2_0, workloads: [] },
      pipelineConfigs: { stages: [] },
      qualityGatesConfigs: { "quality-gates": [] },
    };

    const workload: any = {
      id: "test-workload",
      incidents: {
        type: TicketManagementTypes.JIRA,
        serverId: "jira-incident-server",
        projectName: "INC",
      },
    };

    applyWorkloadDefaults(config, workload);

    expect(workload.incidents.ticketTypes).toEqual(["Incident", "Problem"]);
    expect(workload.incidents.ticketPriorities).toEqual(["Critical", "High"]);
  });

  it("should apply both project and incident management defaults", () => {
    const config: ConfigHolder = {
      metadata: { name: "test", version: "1.0.0" },
      remoteConfigs: {
        version: ConfigVersion.V2_0,
        codeAnalysis: {},
        codeManagement: {},
        pipelines: {},
        ticketManagement: {
          jira: {
            servers: [
              {
                id: "jira-pm-server",
                url: "https://jira.example.com",
                apiKey: "secret",
                authMethod: AuthMethod.BEARER_TOKEN,
                defaults: {
                  projectName: "DEFAULT",
                  ticketTypes: ["Bug"],
                  ticketPriorities: ["High"],
                },
              },
              {
                id: "jira-incident-server",
                url: "https://jira.example.com",
                apiKey: "secret",
                authMethod: AuthMethod.BEARER_TOKEN,
                defaults: {
                  projectName: "DEFAULT",
                  ticketTypes: ["Incident"],
                  ticketPriorities: ["Critical"],
                },
              },
            ],
          },
        },
      },
      workloadConfigs: { version: ConfigVersion.V2_0, workloads: [] },
      pipelineConfigs: { stages: [] },
      qualityGatesConfigs: { "quality-gates": [] },
    };

    const workload: any = {
      id: "test-workload",
      projectManagement: {
        type: TicketManagementTypes.JIRA,
        serverId: "jira-pm-server",
        projectName: "TEST",
      },
      incidents: {
        type: TicketManagementTypes.JIRA,
        serverId: "jira-incident-server",
        projectName: "INC",
      },
    };

    applyWorkloadDefaults(config, workload);

    expect(workload.projectManagement.ticketTypes).toEqual(["Bug"]);
    expect(workload.projectManagement.ticketPriorities).toEqual(["High"]);
    expect(workload.incidents.ticketTypes).toEqual(["Incident"]);
    expect(workload.incidents.ticketPriorities).toEqual(["Critical"]);
  });

  it("should merge defaults with existing workload properties", () => {
    const config: ConfigHolder = {
      metadata: { name: "test", version: "1.0.0" },
      remoteConfigs: {
        version: ConfigVersion.V2_0,
        codeAnalysis: {},
        codeManagement: {},
        pipelines: {},
        ticketManagement: {
          jira: {
            servers: [
              {
                id: "jira-server",
                url: "https://jira.example.com",
                apiKey: "secret",
                authMethod: AuthMethod.BEARER_TOKEN,
                defaults: {
                  projectName: "DEFAULT",
                  ticketTypes: ["Bug", "Story"],
                  ticketPriorities: ["High", "Medium"],
                },
              },
            ],
          },
        },
      },
      workloadConfigs: { version: ConfigVersion.V2_0, workloads: [] },
      pipelineConfigs: { stages: [] },
      qualityGatesConfigs: { "quality-gates": [] },
    };

    const workload: any = {
      id: "test-workload",
      projectManagement: {
        type: TicketManagementTypes.JIRA,
        serverId: "jira-server",
        projectName: "TEST",
        ticketTypes: ["Epic"],
        ticketPriorities: ["Critical"],
      },
    };

    applyWorkloadDefaults(config, workload);

    // lodash merge will merge arrays by combining them
    expect(workload.projectManagement.ticketTypes).toEqual(["Bug", "Story"]);
    expect(workload.projectManagement.ticketPriorities).toEqual(["High", "Medium"]);
  });

  it("should handle workload with no project management", () => {
    const config: ConfigHolder = {
      metadata: { name: "test", version: "1.0.0" },
      remoteConfigs: {
        version: ConfigVersion.V2_0,
        codeAnalysis: {},
        codeManagement: {},
        pipelines: {},
        ticketManagement: {
          jira: {
            servers: [
              {
                id: "jira-server",
                url: "https://jira.example.com",
                apiKey: "secret",
                authMethod: AuthMethod.BEARER_TOKEN,
                defaults: {
                  projectName: "DEFAULT",
                  ticketTypes: ["Bug"],
                },
              },
            ],
          },
        },
      },
      workloadConfigs: { version: ConfigVersion.V2_0, workloads: [] },
      pipelineConfigs: { stages: [] },
      qualityGatesConfigs: { "quality-gates": [] },
    };

    const workload: any = {
      id: "test-workload",
      projectManagement: undefined,
    };

    // Should not throw
    expect(() => applyWorkloadDefaults(config, workload)).not.toThrow();
    expect(workload.projectManagement).toBeUndefined();
  });

  it("should handle workload with no incident management", () => {
    const config: ConfigHolder = {
      metadata: { name: "test", version: "1.0.0" },
      remoteConfigs: {
        version: ConfigVersion.V2_0,
        codeAnalysis: {},
        codeManagement: {},
        pipelines: {},
        ticketManagement: {
          jira: {
            servers: [
              {
                id: "jira-server",
                url: "https://jira.example.com",
                apiKey: "secret",
                authMethod: AuthMethod.BEARER_TOKEN,
                defaults: {
                  projectName: "DEFAULT",
                  ticketTypes: ["Incident"],
                },
              },
            ],
          },
        },
      },
      workloadConfigs: { version: ConfigVersion.V2_0, workloads: [] },
      pipelineConfigs: { stages: [] },
      qualityGatesConfigs: { "quality-gates": [] },
    };

    const workload: any = {
      id: "test-workload",
      incidents: undefined,
    };

    // Should not throw
    expect(() => applyWorkloadDefaults(config, workload)).not.toThrow();
    expect(workload.incidents).toBeUndefined();
  });

  it("should handle missing server defaults", () => {
    const config: ConfigHolder = {
      metadata: { name: "test", version: "1.0.0" },
      remoteConfigs: {
        version: ConfigVersion.V2_0,
        codeAnalysis: {},
        codeManagement: {},
        pipelines: {},
        ticketManagement: {
          jira: {
            servers: [
              {
                id: "jira-server",
                url: "https://jira.example.com",
                apiKey: "secret",
                authMethod: AuthMethod.BEARER_TOKEN,
                defaults: undefined, // No defaults
              },
            ],
          },
        },
      },
      workloadConfigs: { version: ConfigVersion.V2_0, workloads: [] },
      pipelineConfigs: { stages: [] },
      qualityGatesConfigs: { "quality-gates": [] },
    };

    const workload: any = {
      id: "test-workload",
      projectManagement: {
        type: TicketManagementTypes.JIRA,
        serverId: "jira-server",
        projectName: "TEST",
      },
    };

    // Should not throw when defaults are missing
    expect(() => applyWorkloadDefaults(config, workload)).not.toThrow();
  });

  it("should handle non-existent server ID", () => {
    const config: ConfigHolder = {
      metadata: { name: "test", version: "1.0.0" },
      remoteConfigs: {
        version: ConfigVersion.V2_0,
        codeAnalysis: {},
        codeManagement: {},
        pipelines: {},
        ticketManagement: {
          jira: {
            servers: [
              {
                id: "jira-server-1",
                url: "https://jira.example.com",
                apiKey: "secret",
                authMethod: AuthMethod.BEARER_TOKEN,
                defaults: {
                  projectName: "DEFAULT",
                  ticketTypes: ["Bug"],
                },
              },
            ],
          },
        },
      },
      workloadConfigs: { version: ConfigVersion.V2_0, workloads: [] },
      pipelineConfigs: { stages: [] },
      qualityGatesConfigs: { "quality-gates": [] },
    };

    const workload: any = {
      id: "test-workload",
      projectManagement: {
        type: TicketManagementTypes.JIRA,
        serverId: "non-existent-server",
        projectName: "TEST",
      },
    };

    // Should not throw when server ID is not found
    expect(() => applyWorkloadDefaults(config, workload)).not.toThrow();
  });

  it("should handle missing ticket management type in remote config", () => {
    const config: ConfigHolder = {
      metadata: { name: "test", version: "1.0.0" },
      remoteConfigs: {
        version: ConfigVersion.V2_0,
        codeAnalysis: {},
        codeManagement: {},
        pipelines: {},
        ticketManagement: {
          // No jira configuration
        },
      },
      workloadConfigs: { version: ConfigVersion.V2_0, workloads: [] },
      pipelineConfigs: { stages: [] },
      qualityGatesConfigs: { "quality-gates": [] },
    };

    const workload: any = {
      id: "test-workload",
      projectManagement: {
        type: TicketManagementTypes.JIRA,
        serverId: "jira-server",
        projectName: "TEST",
      },
    };

    // Should not throw when ticket management type is not configured
    expect(() => applyWorkloadDefaults(config, workload)).not.toThrow();
  });

  it("should handle partial defaults", () => {
    const config: ConfigHolder = {
      metadata: { name: "test", version: "1.0.0" },
      remoteConfigs: {
        version: ConfigVersion.V2_0,
        codeAnalysis: {},
        codeManagement: {},
        pipelines: {},
        ticketManagement: {
          jira: {
            servers: [
              {
                id: "jira-server",
                url: "https://jira.example.com",
                apiKey: "secret",
                authMethod: AuthMethod.BEARER_TOKEN,
                defaults: {
                  projectName: "DEFAULT",
                  ticketTypes: ["Bug"],
                  // No ticketPriorities
                },
              },
            ],
          },
        },
      },
      workloadConfigs: { version: ConfigVersion.V2_0, workloads: [] },
      pipelineConfigs: { stages: [] },
      qualityGatesConfigs: { "quality-gates": [] },
    };

    const workload: any = {
      id: "test-workload",
      projectManagement: {
        type: TicketManagementTypes.JIRA,
        serverId: "jira-server",
        projectName: "TEST",
      },
    };

    applyWorkloadDefaults(config, workload);

    expect(workload.projectManagement.ticketTypes).toEqual(["Bug"]);
    expect(workload.projectManagement.ticketPriorities).toBeUndefined();
  });
});
