import * as path from "path";
import * as fs from "fs";
import * as YAML from "yaml";

const repoRoot = path.resolve(__dirname, "..", "..", "..", "..", "..");
const { replacePlaceholders, resolveExternalBaseUrl } = require(path.join(repoRoot, "mocks", "azure", "url.js"));

describe("azure mock URL helpers", () => {
  it("builds the public execute-api URL from forwarded headers", () => {
    const baseUrl = resolveExternalBaseUrl({
      environment: {
        server: {
          url: "http://localhost:33867",
        },
      },
      request: {
        headers: {
          host: "wvhmpidlb4.execute-api.eu-west-2.amazonaws.com",
          "x-forwarded-proto": "https",
          "x-forwarded-port": "443",
        },
      },
    });

    expect(baseUrl).toBe("https://wvhmpidlb4.execute-api.eu-west-2.amazonaws.com");
  });

  it("falls back to the embedded server URL when forwarded headers are absent", () => {
    const baseUrl = resolveExternalBaseUrl({
      environment: {
        server: {
          url: "http://localhost:33867",
        },
      },
      request: {
        headers: {},
      },
    });

    expect(baseUrl).toBe("http://localhost:33867");
  });

  it("replaces placeholders recursively in nested response payloads", () => {
    const payload = {
      value: [
        {
          url: "${system.server.url}/_apis/projects/1",
          webUrl: "${system.server.url}/${context.request.pathParams.projectName}/_git/repo",
        },
      ],
    };

    expect(
      replacePlaceholders(payload, {
        "${system.server.url}": "https://wvhmpidlb4.execute-api.eu-west-2.amazonaws.com",
        "${context.request.pathParams.projectName}": "athena",
      }),
    ).toEqual({
      value: [
        {
          url: "https://wvhmpidlb4.execute-api.eu-west-2.amazonaws.com/_apis/projects/1",
          webUrl: "https://wvhmpidlb4.execute-api.eu-west-2.amazonaws.com/athena/_git/repo",
        },
      ],
    });
  });
});

describe("azure mock Imposter runtime safety", () => {
  it("preloads JSON-backed Azure responses through stores", () => {
    const configPath = path.join(repoRoot, "mocks", "azure", "azure-repo-config.yaml");
    const config = YAML.parse(fs.readFileSync(configPath, "utf8"));

    expect(config.system.stores.resourceAreas.preloadFile).toBe("_apis/GET-ResourceAreas.json");
    expect(config.system.stores.repositories.preloadFile).toBe("workload/_apis/git/GET-repositories.json");
  });

  it("avoids require() in Azure Imposter script files executed in Lambda", () => {
    const scriptPaths = [
      path.join(repoRoot, "mocks", "azure", "_apis", "GET-resourceArea.js"),
      path.join(repoRoot, "mocks", "azure", "workload", "_apis", "git", "GET-repositories.js"),
    ];

    for (const scriptPath of scriptPaths) {
      const script = fs.readFileSync(scriptPath, "utf8");

      expect(script).not.toMatch(/\brequire\s*\(/);
      expect(script).toMatch(/stores\.open\(/);
    }
  });

  it("reads preloaded Azure store content via loadAll with a compatibility fallback", () => {
    const scriptPaths = [
      path.join(repoRoot, "mocks", "azure", "_apis", "GET-resourceArea.js"),
      path.join(repoRoot, "mocks", "azure", "workload", "_apis", "git", "GET-repositories.js"),
    ];

    for (const scriptPath of scriptPaths) {
      const script = fs.readFileSync(scriptPath, "utf8");

      expect(script).toMatch(/\.loadAll\(\)/);
      expect(script).toMatch(/\.load\("data"\)/);
    }
  });
});
