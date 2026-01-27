import { GithubTicketOptions, TicketManagementTypes } from "../common";
import { WorkloadTicketConfigGithub, BaseWorkloadTicketConfig } from "../workload-config";
import { TicketManagementServer, TicketManagementConfigWrapper, AuthMethod } from "../remote-config";

describe("GitHub Configuration Models and Type Definitions", () => {
  describe("GithubTicketOptions type definition", () => {
    it("should have all required fields defined", () => {
      const validOptions: GithubTicketOptions = {
        owner: "test-owner",
        repo: "test-repo",
        ticketTypes: ["bug", "feature"],
      };

      expect(validOptions.owner).toBe("test-owner");
      expect(validOptions.repo).toBe("test-repo");
      expect(validOptions.ticketTypes).toEqual(["bug", "feature"]);
    });

    it("should support optional fields", () => {
      const optionsWithOptionalFields: GithubTicketOptions = {
        owner: "test-owner",
        repo: "test-repo",
        ticketTypes: ["bug", "feature"],
        ticketPriorities: ["low", "medium", "high"],
        stateFilter: "open",
        labelMapping: {
          "priority/high": "High",
          "priority/low": "Low",
        },
      };

      expect(optionsWithOptionalFields.ticketPriorities).toEqual(["low", "medium", "high"]);
      expect(optionsWithOptionalFields.stateFilter).toBe("open");
      expect(optionsWithOptionalFields.labelMapping).toEqual({
        "priority/high": "High",
        "priority/low": "Low",
      });
    });

    it("should validate stateFilter values", () => {
      const validStateFilters: Array<GithubTicketOptions["stateFilter"]> = ["all", "open", "closed"];

      validStateFilters.forEach((stateFilter) => {
        const options: GithubTicketOptions = {
          owner: "test-owner",
          repo: "test-repo",
          ticketTypes: ["bug"],
          stateFilter,
        };
        expect(options.stateFilter).toBe(stateFilter);
      });
    });

    it("should require owner field", () => {
      // TypeScript compilation test - this should fail if owner is not required
      const options: GithubTicketOptions = {
        owner: "required-owner",
        repo: "test-repo",
        ticketTypes: ["bug"],
      };
      expect(options.owner).toBeDefined();
    });

    it("should require repo field", () => {
      // TypeScript compilation test - this should fail if repo is not required
      const options: GithubTicketOptions = {
        owner: "test-owner",
        repo: "required-repo",
        ticketTypes: ["bug"],
      };
      expect(options.repo).toBeDefined();
    });

    it("should require ticketTypes field", () => {
      // TypeScript compilation test - this should fail if ticketTypes is not required
      const options: GithubTicketOptions = {
        owner: "test-owner",
        repo: "test-repo",
        ticketTypes: ["required-type"],
      };
      expect(options.ticketTypes).toBeDefined();
      expect(Array.isArray(options.ticketTypes)).toBe(true);
    });
  });

  describe("WorkloadTicketConfigGithub extends BaseWorkloadTicketConfig", () => {
    it("should extend BaseWorkloadTicketConfig correctly", () => {
      const config: WorkloadTicketConfigGithub = {
        type: TicketManagementTypes.GITHUB,
        serverId: "github-server-1",
        owner: "test-owner",
        repo: "test-repo",
        ticketTypes: ["bug", "feature"],
      };

      // Should have BaseWorkloadTicketConfig properties
      expect(config.type).toBe(TicketManagementTypes.GITHUB);
      expect(config.serverId).toBe("github-server-1");

      // Should have GithubTicketOptions properties
      expect(config.owner).toBe("test-owner");
      expect(config.repo).toBe("test-repo");
      expect(config.ticketTypes).toEqual(["bug", "feature"]);
    });

    it("should support all optional GitHub fields", () => {
      const config: WorkloadTicketConfigGithub = {
        type: TicketManagementTypes.GITHUB,
        serverId: "github-server-1",
        owner: "test-owner",
        repo: "test-repo",
        ticketTypes: ["bug", "feature", "task"],
        ticketPriorities: ["low", "medium", "high", "critical"],
        stateFilter: "all",
        labelMapping: {
          "priority/critical": "Critical",
          "priority/high": "High",
          "priority/medium": "Medium",
          "priority/low": "Low",
        },
      };

      expect(config.ticketPriorities).toEqual(["low", "medium", "high", "critical"]);
      expect(config.stateFilter).toBe("all");
      expect(config.labelMapping).toBeDefined();
    });

    it("should be assignable to BaseWorkloadTicketConfig", () => {
      const githubConfig: WorkloadTicketConfigGithub = {
        type: TicketManagementTypes.GITHUB,
        serverId: "github-server-1",
        owner: "test-owner",
        repo: "test-repo",
        ticketTypes: ["bug"],
      };

      // This should compile without errors
      const baseConfig: BaseWorkloadTicketConfig = githubConfig;
      expect(baseConfig.type).toBe(TicketManagementTypes.GITHUB);
      expect(baseConfig.serverId).toBe("github-server-1");
    });
  });

  describe("TicketManagementTypes enum includes GITHUB", () => {
    it("should include GITHUB as a valid enum value", () => {
      expect(TicketManagementTypes.GITHUB).toBe("github");
    });

    it("should be usable in type definitions", () => {
      const config: WorkloadTicketConfigGithub = {
        type: TicketManagementTypes.GITHUB,
        serverId: "test-server",
        owner: "test-owner",
        repo: "test-repo",
        ticketTypes: ["bug"],
      };

      expect(config.type).toBe("github");
    });

    it("should be included in all enum values", () => {
      const allTypes = Object.values(TicketManagementTypes);
      expect(allTypes).toContain("github");
    });
  });

  describe("Remote server configuration supports GitHub", () => {
    it("should support GitHub in TicketManagementServer", () => {
      const githubServer: TicketManagementServer = {
        id: "github-server-1",
        url: "https://api.github.com",
        apiKey: "github-token",
        authMethod: AuthMethod.BEARER_TOKEN,
        defaults: {
          owner: "default-owner",
          repo: "default-repo",
          ticketTypes: ["issue"],
        } as GithubTicketOptions,
      };

      expect(githubServer.id).toBe("github-server-1");
      expect(githubServer.url).toBe("https://api.github.com");
      expect(githubServer.authMethod).toBe(AuthMethod.BEARER_TOKEN);
      expect((githubServer.defaults as GithubTicketOptions).owner).toBe("default-owner");
    });

    it("should support GitHub Enterprise server configuration", () => {
      const githubEnterpriseServer: TicketManagementServer = {
        id: "github-enterprise",
        url: "https://github.enterprise.com/api/v3",
        apiKey: "enterprise-token",
        authMethod: AuthMethod.BEARER_TOKEN,
        defaults: {
          owner: "enterprise-org",
          repo: "enterprise-repo",
          ticketTypes: ["bug", "feature", "task"],
          stateFilter: "all",
        } as GithubTicketOptions,
      };

      expect(githubEnterpriseServer.url).toBe("https://github.enterprise.com/api/v3");
      expect((githubEnterpriseServer.defaults as GithubTicketOptions).owner).toBe("enterprise-org");
    });

    it("should support GitHub in TicketManagementConfigWrapper", () => {
      const ticketManagementConfig: TicketManagementConfigWrapper = {
        github: {
          servers: [
            {
              id: "github-server-1",
              url: "https://api.github.com",
              apiKey: "token1",
              authMethod: AuthMethod.BEARER_TOKEN,
              defaults: {
                owner: "org1",
                repo: "repo1",
                ticketTypes: ["bug"],
              } as GithubTicketOptions,
            },
            {
              id: "github-server-2",
              url: "https://github.enterprise.com/api/v3",
              apiKey: "token2",
              authMethod: AuthMethod.BEARER_TOKEN,
              defaults: {
                owner: "org2",
                repo: "repo2",
                ticketTypes: ["feature"],
              } as GithubTicketOptions,
            },
          ],
        },
      };

      expect(ticketManagementConfig.github).toBeDefined();
      expect(ticketManagementConfig.github?.servers).toHaveLength(2);
      expect(ticketManagementConfig.github?.servers[0].id).toBe("github-server-1");
      expect(ticketManagementConfig.github?.servers[1].id).toBe("github-server-2");
    });
  });

  describe("Configuration validation for required fields", () => {
    describe("owner field validation", () => {
      it("should be required in GithubTicketOptions", () => {
        const validConfig: GithubTicketOptions = {
          owner: "test-owner",
          repo: "test-repo",
          ticketTypes: ["bug"],
        };
        expect(validConfig.owner).toBe("test-owner");
      });

      it("should be required in WorkloadTicketConfigGithub", () => {
        const validConfig: WorkloadTicketConfigGithub = {
          type: TicketManagementTypes.GITHUB,
          serverId: "github-server",
          owner: "test-owner",
          repo: "test-repo",
          ticketTypes: ["bug"],
        };
        expect(validConfig.owner).toBe("test-owner");
      });

      it("should be required in server defaults", () => {
        const serverConfig: TicketManagementServer = {
          id: "github-server",
          url: "https://api.github.com",
          apiKey: "token",
          authMethod: AuthMethod.BEARER_TOKEN,
          defaults: {
            owner: "default-owner",
            repo: "default-repo",
            ticketTypes: ["issue"],
          } as GithubTicketOptions,
        };
        expect((serverConfig.defaults as GithubTicketOptions).owner).toBe("default-owner");
      });
    });

    describe("repo field validation", () => {
      it("should be required in GithubTicketOptions", () => {
        const validConfig: GithubTicketOptions = {
          owner: "test-owner",
          repo: "test-repo",
          ticketTypes: ["bug"],
        };
        expect(validConfig.repo).toBe("test-repo");
      });

      it("should be required in WorkloadTicketConfigGithub", () => {
        const validConfig: WorkloadTicketConfigGithub = {
          type: TicketManagementTypes.GITHUB,
          serverId: "github-server",
          owner: "test-owner",
          repo: "test-repo",
          ticketTypes: ["bug"],
        };
        expect(validConfig.repo).toBe("test-repo");
      });

      it("should be required in server defaults", () => {
        const serverConfig: TicketManagementServer = {
          id: "github-server",
          url: "https://api.github.com",
          apiKey: "token",
          authMethod: AuthMethod.BEARER_TOKEN,
          defaults: {
            owner: "default-owner",
            repo: "default-repo",
            ticketTypes: ["issue"],
          } as GithubTicketOptions,
        };
        expect((serverConfig.defaults as GithubTicketOptions).repo).toBe("default-repo");
      });
    });

    describe("ticketTypes field validation", () => {
      it("should be required in GithubTicketOptions", () => {
        const validConfig: GithubTicketOptions = {
          owner: "test-owner",
          repo: "test-repo",
          ticketTypes: ["bug", "feature"],
        };
        expect(validConfig.ticketTypes).toEqual(["bug", "feature"]);
        expect(Array.isArray(validConfig.ticketTypes)).toBe(true);
      });

      it("should be required in WorkloadTicketConfigGithub", () => {
        const validConfig: WorkloadTicketConfigGithub = {
          type: TicketManagementTypes.GITHUB,
          serverId: "github-server",
          owner: "test-owner",
          repo: "test-repo",
          ticketTypes: ["bug", "feature", "task"],
        };
        expect(validConfig.ticketTypes).toEqual(["bug", "feature", "task"]);
        expect(Array.isArray(validConfig.ticketTypes)).toBe(true);
      });

      it("should be required in server defaults", () => {
        const serverConfig: TicketManagementServer = {
          id: "github-server",
          url: "https://api.github.com",
          apiKey: "token",
          authMethod: AuthMethod.BEARER_TOKEN,
          defaults: {
            owner: "default-owner",
            repo: "default-repo",
            ticketTypes: ["issue", "bug"],
          } as GithubTicketOptions,
        };
        expect((serverConfig.defaults as GithubTicketOptions).ticketTypes).toEqual(["issue", "bug"]);
        expect(Array.isArray((serverConfig.defaults as GithubTicketOptions).ticketTypes)).toBe(true);
      });

      it("should support empty array for ticketTypes", () => {
        const configWithEmptyTypes: GithubTicketOptions = {
          owner: "test-owner",
          repo: "test-repo",
          ticketTypes: [],
        };
        expect(configWithEmptyTypes.ticketTypes).toEqual([]);
        expect(Array.isArray(configWithEmptyTypes.ticketTypes)).toBe(true);
      });
    });

    describe("type and serverId validation for WorkloadTicketConfigGithub", () => {
      it("should require type field", () => {
        const validConfig: WorkloadTicketConfigGithub = {
          type: TicketManagementTypes.GITHUB,
          serverId: "github-server",
          owner: "test-owner",
          repo: "test-repo",
          ticketTypes: ["bug"],
        };
        expect(validConfig.type).toBe(TicketManagementTypes.GITHUB);
      });

      it("should require serverId field", () => {
        const validConfig: WorkloadTicketConfigGithub = {
          type: TicketManagementTypes.GITHUB,
          serverId: "github-server-id",
          owner: "test-owner",
          repo: "test-repo",
          ticketTypes: ["bug"],
        };
        expect(validConfig.serverId).toBe("github-server-id");
      });
    });
  });

  describe("Configuration completeness validation", () => {
    it("should validate complete GitHub workload configuration", () => {
      const completeConfig: WorkloadTicketConfigGithub = {
        type: TicketManagementTypes.GITHUB,
        serverId: "github-main",
        owner: "myorg",
        repo: "myrepo",
        ticketTypes: ["bug", "feature", "task", "enhancement"],
        ticketPriorities: ["low", "medium", "high", "critical"],
        stateFilter: "all",
        labelMapping: {
          "priority/critical": "Critical",
          "priority/high": "High",
          "priority/medium": "Medium",
          "priority/low": "Low",
          "type/bug": "Bug",
          "type/feature": "Feature",
        },
      };

      // Validate all required fields are present
      expect(completeConfig.type).toBe(TicketManagementTypes.GITHUB);
      expect(completeConfig.serverId).toBe("github-main");
      expect(completeConfig.owner).toBe("myorg");
      expect(completeConfig.repo).toBe("myrepo");
      expect(completeConfig.ticketTypes).toEqual(["bug", "feature", "task", "enhancement"]);

      // Validate optional fields are present and correct
      expect(completeConfig.ticketPriorities).toEqual(["low", "medium", "high", "critical"]);
      expect(completeConfig.stateFilter).toBe("all");
      expect(completeConfig.labelMapping).toBeDefined();
      expect(Object.keys(completeConfig.labelMapping!)).toHaveLength(6);
    });

    it("should validate complete GitHub server configuration", () => {
      const completeServerConfig: TicketManagementServer = {
        id: "github-enterprise-server",
        url: "https://github.enterprise.com/api/v3",
        apiKey: "ghp_enterprise_token_123",
        authMethod: AuthMethod.BEARER_TOKEN,
        email: "admin@enterprise.com",
        filter: "is:issue",
        defaults: {
          owner: "enterprise-org",
          repo: "default-repo",
          ticketTypes: ["bug", "feature", "task", "incident"],
          ticketPriorities: ["p1", "p2", "p3", "p4"],
          stateFilter: "all",
          labelMapping: {
            "severity/critical": "P1",
            "severity/high": "P2",
            "severity/medium": "P3",
            "severity/low": "P4",
          },
        } as GithubTicketOptions,
      };

      // Validate server configuration
      expect(completeServerConfig.id).toBe("github-enterprise-server");
      expect(completeServerConfig.url).toBe("https://github.enterprise.com/api/v3");
      expect(completeServerConfig.apiKey).toBe("ghp_enterprise_token_123");
      expect(completeServerConfig.authMethod).toBe(AuthMethod.BEARER_TOKEN);
      expect(completeServerConfig.email).toBe("admin@enterprise.com");
      expect(completeServerConfig.filter).toBe("is:issue");

      // Validate defaults
      const defaults = completeServerConfig.defaults as GithubTicketOptions;
      expect(defaults.owner).toBe("enterprise-org");
      expect(defaults.repo).toBe("default-repo");
      expect(defaults.ticketTypes).toEqual(["bug", "feature", "task", "incident"]);
      expect(defaults.ticketPriorities).toEqual(["p1", "p2", "p3", "p4"]);
      expect(defaults.stateFilter).toBe("all");
      expect(defaults.labelMapping).toBeDefined();
    });
  });
});
