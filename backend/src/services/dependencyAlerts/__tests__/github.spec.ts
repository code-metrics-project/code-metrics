import { initGithubDependencyAlerts } from "../github";
import { initDatastore } from "../../../db/factory";
import { getDependencyAlertsForWorkloadId } from "../dependencyAlertsService";
import { loadConfig } from "../../../config/config";
import { ConfigVersion } from "../../../model/config/base";
import { Workload } from "../../../model/config/workload-config";
import { CodeManagementTypes, TicketManagementTypes } from "../../../model/config/common";
import { AuthMethod } from "../../../model/config/remote-config";
import * as githubAppAuth from "../../auth/github-app";
import { Octokit } from "@octokit/rest";

const workload: Workload = {
  id: "athena",
  codeManagement: {
    type: CodeManagementTypes.GITHUB,
    serverId: "test-github",
    projectName: "DeloitteDigitalUK",
    repoGroups: {},
  },
  projectManagement: {
    type: TicketManagementTypes.JIRA,
    serverId: "test-jira",
    tableName: undefined,
  },
  incidents: {
    type: TicketManagementTypes.JIRA,
    serverId: "test-jira",
    tableName: undefined,
  },
} as any;

beforeAll(async () => {
  await initDatastore();
  initGithubDependencyAlerts();

  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      codeManagement: {
        github: {
          servers: [
            {
              id: "test-github",
              url: "http://localhost:8080",
              branches: ["main"],
              apiKey: undefined,
            },
          ],
        },
      },
      codeAnalysis: {},
      pipelines: {},
      ticketManagement: {},
    },
    workloadConfig: {
      version: ConfigVersion.V2_0,
      workloads: [workload],
    },
  });
});

describe("GithubDependencyAlertsService", () => {
  describe("analyseAlerts", () => {
    it("should return empty analysis when no alerts exist", () => {
      const service = getDependencyAlertsForWorkloadId("athena");
      const result = (service as any).analyseAlerts("athena", "test-repo", []);

      expect(result.total).toBe(0);
      expect(result.summary.complianceRate).toBe("100");
      expect(Object.keys(result.byPackage)).toHaveLength(0);
    });

    it("should calculate alert age correctly", () => {
      const service = getDependencyAlertsForWorkloadId("athena");
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const age = (service as any).calculateAlertAge(oneDayAgo);
      expect(age).toBeGreaterThanOrEqual(1);
      expect(age).toBeLessThanOrEqual(2);
    });

    it("should identify SLA violations for critical alerts", () => {
      const service = getDependencyAlertsForWorkloadId("athena");
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

      const mockAlert = {
        number: 1,
        state: "open",
        created_at: eightDaysAgo,
        updated_at: eightDaysAgo,
        html_url: "https://github.com/test/repo/security/dependabot/1",
        security_advisory: {
          severity: "critical",
          summary: "Test vulnerability",
        },
        dependency: {
          package: {
            name: "test-package",
          },
        },
      };

      const result = (service as any).analyseAlerts("athena", "test-repo", [mockAlert]);

      expect(result.total).toBe(1);
      expect(result.summary.openViolations).toBe(1);
      expect(result.slaViolations.length).toBe(1);
      expect(result.slaViolations[0].daysOverdue).toBeGreaterThanOrEqual(1);
      expect(result.slaViolations[0].daysOverdue).toBeLessThanOrEqual(2);
    });

    it("should mark alerts as compliant if within SLA", () => {
      const service = getDependencyAlertsForWorkloadId("athena");
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

      const mockAlert = {
        number: 1,
        state: "open",
        created_at: threeDaysAgo,
        updated_at: threeDaysAgo,
        html_url: "https://github.com/test/repo/security/dependabot/1",
        security_advisory: {
          severity: "critical",
          summary: "Test vulnerability",
        },
        dependency: {
          package: {
            name: "test-package",
          },
        },
      };

      const result = (service as any).analyseAlerts("athena", "test-repo", [mockAlert]);

      expect(result.total).toBe(1);
      expect(result.summary.openViolations).toBe(0);
      expect(result.compliant.length).toBe(1);
    });

    it("should aggregate alerts by package", () => {
      const service = getDependencyAlertsForWorkloadId("athena");
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

      const mockAlerts = [
        {
          number: 1,
          state: "open",
          created_at: eightDaysAgo,
          updated_at: eightDaysAgo,
          html_url: "https://github.com/test/repo/security/dependabot/1",
          security_advisory: {
            severity: "critical",
            summary: "Test vulnerability 1",
          },
          dependency: {
            package: {
              name: "io.netty:netty-codec-http2",
            },
          },
        },
        {
          number: 2,
          state: "open",
          created_at: threeDaysAgo,
          updated_at: threeDaysAgo,
          html_url: "https://github.com/test/repo/security/dependabot/2",
          security_advisory: {
            severity: "high",
            summary: "Test vulnerability 2",
          },
          dependency: {
            package: {
              name: "io.netty:netty-codec-http2",
            },
          },
        },
        {
          number: 3,
          state: "open",
          created_at: threeDaysAgo,
          updated_at: threeDaysAgo,
          html_url: "https://github.com/test/repo/security/dependabot/3",
          security_advisory: {
            severity: "medium",
            summary: "Test vulnerability 3",
          },
          dependency: {
            package: {
              name: "com.example:another-package",
            },
          },
        },
      ];

      const result = (service as any).analyseAlerts("athena", "test-repo", mockAlerts);

      expect(result.total).toBe(3);
      expect(Object.keys(result.byPackage)).toHaveLength(2);

      // Check netty package aggregation
      const nettyPackage = result.byPackage["io.netty:netty-codec-http2"];
      expect(nettyPackage).toBeDefined();
      expect(nettyPackage.totalAlerts).toBe(2);
      expect(nettyPackage.openAlerts).toBe(2);
      expect(nettyPackage.criticalCount).toBe(1);
      expect(nettyPackage.highCount).toBe(1);
      expect(nettyPackage.mediumCount).toBe(0);
      expect(nettyPackage.lowCount).toBe(0);
      expect(nettyPackage.violations).toBeGreaterThanOrEqual(1);
      expect(nettyPackage.repositories).toContain("test-repo");

      // Check another package aggregation
      const anotherPackage = result.byPackage["com.example:another-package"];
      expect(anotherPackage).toBeDefined();
      expect(anotherPackage.totalAlerts).toBe(1);
      expect(anotherPackage.openAlerts).toBe(1);
      expect(anotherPackage.mediumCount).toBe(1);
    });
  });

  describe("getConnection", () => {
    const githubAppWorkload: Workload = {
      id: "athena-app",
      codeManagement: {
        type: CodeManagementTypes.GITHUB,
        serverId: "test-github-app",
        projectName: "DeloitteDigitalUK",
        repoGroups: {},
      },
      projectManagement: {
        type: TicketManagementTypes.JIRA,
        serverId: "test-jira",
        tableName: undefined,
      },
      incidents: {
        type: TicketManagementTypes.JIRA,
        serverId: "test-jira",
        tableName: undefined,
      },
    } as any;

    beforeEach(async () => {
      await loadConfig({
        remoteConfig: {
          version: ConfigVersion.V2_0,
          codeManagement: {
            github: {
              servers: [
                {
                  id: "test-github-app",
                  url: "http://localhost:8080",
                  branches: ["main"],
                  authMethod: AuthMethod.GITHUB_APP,
                  githubApp: {
                    appId: "test-app-id",
                    privateKey: "-----BEGIN RSA PRIVATE KEY-----\ntest-key\n-----END RSA PRIVATE KEY-----",
                    installationId: "12345",
                  },
                },
              ],
            },
          },
          codeAnalysis: {},
          pipelines: {},
          ticketManagement: {},
        },
        workloadConfig: {
          version: ConfigVersion.V2_0,
          workloads: [githubAppWorkload],
        },
      });
    });

    it("should use GitHub App authentication when authMethod is GITHUB_APP", () => {
      const mockOctokit = {} as Octokit;
      const createGitHubAppOctokitSpy = jest
        .spyOn(githubAppAuth, "createGitHubAppOctokit")
        .mockReturnValue(mockOctokit);

      const service = getDependencyAlertsForWorkloadId("athena-app");
      // Reset connections to force re-creation
      (service as any).connections = new Map();

      (service as any).getConnection("athena-app");

      expect(createGitHubAppOctokitSpy).toHaveBeenCalledWith(
        {
          appId: "test-app-id",
          privateKey: "-----BEGIN RSA PRIVATE KEY-----\ntest-key\n-----END RSA PRIVATE KEY-----",
          installationId: "12345",
        },
        "http://localhost:8080",
      );

      createGitHubAppOctokitSpy.mockRestore();
    });

    it("should use PAT authentication when authMethod is BEARER_TOKEN", async () => {
      await loadConfig({
        remoteConfig: {
          version: ConfigVersion.V2_0,
          codeManagement: {
            github: {
              servers: [
                {
                  id: "test-github-pat",
                  url: "http://localhost:8080",
                  branches: ["main"],
                  authMethod: AuthMethod.BEARER_TOKEN,
                  apiKey: "test-pat-token",
                },
              ],
            },
          },
          codeAnalysis: {},
          pipelines: {},
          ticketManagement: {},
        },
        workloadConfig: {
          version: ConfigVersion.V2_0,
          workloads: [
            {
              ...githubAppWorkload,
              id: "athena-pat",
              codeManagement: { ...githubAppWorkload.codeManagement, serverId: "test-github-pat" },
            },
          ],
        },
      });

      const createGitHubAppOctokitSpy = jest.spyOn(githubAppAuth, "createGitHubAppOctokit");

      const service = getDependencyAlertsForWorkloadId("athena-pat");
      (service as any).connections = new Map();
      (service as any).getConnection("athena-pat");

      expect(createGitHubAppOctokitSpy).not.toHaveBeenCalled();

      createGitHubAppOctokitSpy.mockRestore();
    });
  });
});
