import * as path from "path";
import * as fs from "fs";
import * as YAML from "yaml";

const repoRoot = path.resolve(__dirname, "..", "..", "..", "..", "..");
const mocksDir = path.join(repoRoot, "mocks");

function listMockScripts(dir: string): string[] {
  const scripts: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scripts.push(...listMockScripts(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      scripts.push(entryPath);
    }
  }

  return scripts;
}

describe("mock query parameter handling", () => {
  const scriptPaths = listMockScripts(mocksDir);

  it("finds mock scripts to inspect", () => {
    expect(scriptPaths.length).toBeGreaterThan(0);
  });

  it("reads query parameters directly rather than re-parsing the request URI", () => {
    for (const scriptPath of scriptPaths) {
      const script = fs.readFileSync(scriptPath, "utf8");
      const relativePath = path.relative(repoRoot, scriptPath);

      // The Lambda adapter now forwards query parameters, so the getQueryParams()
      // fallback that re-parsed context.request.uri is no longer needed.
      expect(`${relativePath}: ${script}`).not.toMatch(/function getQueryParams/);
      expect(`${relativePath}: ${script}`).not.toMatch(/\brequest\.uri\b/);
      expect(`${relativePath}: ${script}`).not.toMatch(/\breq\.uri\b/);
    }
  });

  it("uses queryParams in the Sonar scripts", () => {
    const historic = fs.readFileSync(path.join(mocksDir, "sonar", "historic.js"), "utf8");
    expect(historic).toMatch(/req\.queryParams\.component/);
    expect(historic).toMatch(/req\.queryParams\.metrics/);

    const component = fs.readFileSync(path.join(mocksDir, "sonar", "sonarComponent.js"), "utf8");
    expect(component).toMatch(/req\.queryParams\.component/);
    expect(component).toMatch(/req\.queryParams\.metricKeys/);
  });

  it("uses queryParams in the Jira search script", () => {
    const search = fs.readFileSync(path.join(mocksDir, "jira", "search.js"), "utf8");
    expect(search).toMatch(/context\.request\.queryParams\.jql/);
  });
});

describe("Sonar mock routing", () => {
  const config = YAML.parse(fs.readFileSync(path.join(mocksDir, "sonar", "sonar-config.yaml"), "utf8"));
  const resources: any[] = config.resources;

  it("matches search_history routes on queryParams", () => {
    const searchHistory = resources.filter((resource) => resource.path === "/api/measures/search_history");

    expect(searchHistory.length).toBeGreaterThan(3);
    for (const resource of searchHistory) {
      expect(resource.queryParams?.metrics).toBeDefined();
    }

    // Component-specific fixtures win over the generic script-backed routes
    // because imposter-go selects the highest-scoring resource match.
    const componentSpecific = searchHistory.filter((resource) => resource.queryParams?.component);
    expect(componentSpecific.length).toBeGreaterThan(0);
    for (const resource of componentSpecific) {
      expect(resource.response.staticData).toBeDefined();
    }

    const generic = searchHistory.filter((resource) => !resource.queryParams?.component);
    expect(generic.length).toBeGreaterThan(0);
    for (const resource of generic) {
      expect(resource.response.scriptFile).toBe("historic.js");
    }
  });

  it("matches search_projects routes on the tag filter with a default empty response", () => {
    const searchProjects = resources.filter((resource) => resource.path === "/api/components/search_projects");

    expect(searchProjects.length).toBeGreaterThan(1);

    const filtered = searchProjects.filter((resource) => resource.queryParams?.filter);
    expect(filtered.length).toBeGreaterThan(0);
    for (const resource of filtered) {
      expect(resource.response.staticData).toBeDefined();
    }

    const fallback = searchProjects.filter((resource) => !resource.queryParams);
    expect(fallback).toHaveLength(1);
    expect(JSON.parse(fallback[0].response.staticData).components).toEqual([]);
  });

  it("no longer routes search_projects through a script workaround", () => {
    for (const resource of resources) {
      expect(resource.response?.scriptFile).not.toBe("searchProjects.js");
    }

    expect(fs.existsSync(path.join(mocksDir, "sonar", "searchProjects.js"))).toBe(false);
  });
});
