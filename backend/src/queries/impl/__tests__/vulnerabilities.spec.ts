import { groupVulnerabilities } from "../vulnerabilities";
import { Severity, Vulnerability } from "../../../model/vulnerabilities";
import { loadConfig } from "../../../config/config";
import { CodeManagementTypes, TicketManagementTypes } from "../../../model/config/common";
import { Workload } from "../../../model/config/workload-config";
import { ConfigVersion } from "../../../model/config/base";

const workload: Workload = {
  id: "athena",
  codeAnalysis: undefined,
  codeManagement: {
    serverId: "example-github",
    type: CodeManagementTypes.GITHUB,
    projectName: "octocat",
    repoGroups: {
      backend: {
        components: [
          {
            name: "octocat",
            repo: "octocat",
          },
        ],
      }
    }
  },
  pipelines: undefined,
  projectManagement: {
    serverId: "example-jira",
    type: TicketManagementTypes.JIRA,
    tableName: undefined,
  },
  incidents: {
    serverId: "example-jira",
    type: TicketManagementTypes.JIRA,
    tableName: undefined,
  },
};

beforeAll(async () => {
  jest.resetModules();
  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      codeAnalysis: {},
      codeManagement: {},
      pipelines: {},
      ticketManagement: {},
    },
    workloadConfig: {
      version: ConfigVersion.V2_0,
      workloads: [workload],
    },
  });
});

describe("groupVulnerabilities", () => {
  it("aggregates data by day", () => {
    const vulns: Record<string, Vulnerability[]> = {
      athena: [
        {
          severity: Severity.High,
          raised: new Date("2023-12-08"),
          repoName: "octocat",
          message: "High vulnerability",
        },
        {
          severity: Severity.Critical,
          raised: new Date("2023-12-10"),
          repoName: "octocat",
          message: "Critical vulnerability",
        },
      ],
    };
    const grouped = groupVulnerabilities(vulns);

    // entries interpolated between dates
    expect(grouped.size).toBe(3);

    const metrics = grouped.get("2023-12-10");
    expect(metrics).not.toBeNull();
    console.log(metrics);

    // one entry for each of 'high' and 'critical' levels
    expect(metrics["vulns-high"].length).toBe(1);
    expect(metrics["vulns-critical"].length).toBe(1);

    const critEntries = metrics["vulns-critical"].filter((v) => v.dimensions.workloadId === "athena");
    expect(critEntries).toHaveLength(1);
    expect(critEntries[0].date).toStrictEqual(new Date("2023-12-10"));
    expect(critEntries[0].value).toBe(1);

    const highEntries = metrics["vulns-high"].filter((v) => v.dimensions.workloadId === "athena");
    expect(highEntries).toHaveLength(1);
    expect(highEntries[0].date).toStrictEqual(new Date("2023-12-10"));
    expect(highEntries[0].value).toBe(0);
  });
});
