import {
  getCodeAnalysisKeysForWorkloadId,
  getComponentsForWorkloadId,
  getReposForWorkloadId,
  lookupRepoGroupForRepoName,
} from "../repos";
import { clearCachedConfig, loadConfig } from "../../config/config";
import path from "path";
import { registerVcs } from "../../services/codeManagement/vcsService";
import { CodeManagementTypes } from "../../model/config/common";
import { IN_MEMORY_DATASTORE, registerDatastore } from "../../db/factory";
import { InMemoryDatastore } from "../../db/inmem/db";
import { initSonar } from "../../services/codeAnalysis/sonar";

describe("repos", () => {
  initSonar();

  beforeAll(async () => {
    registerDatastore(
      IN_MEMORY_DATASTORE,
      () => Promise.resolve(),
      (config) => new InMemoryDatastore(config),
      true,
    );
    registerVcs(
      CodeManagementTypes.GITHUB,
      //@ts-expect-error
      () => {
        return {
          getReposForProject: () => Promise.resolve(["web", "public-api", "private-api"]),
        };
      },
    );
    clearCachedConfig();
    await loadConfig({ dir: path.join(__dirname, "test-data/defaults") });
  });

  it("should get components for workload id", async () => {
    const workloadId = "athena";
    const repoGroups = ["frontend"];
    const result = await getComponentsForWorkloadId(repoGroups, workloadId);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("web");
  });

  it("should exclude matching components", async () => {
    const workloadId = "athena";
    const repoGroups = ["backend"];
    const result = await getComponentsForWorkloadId(repoGroups, workloadId);

    // the 'public-api' component should be excluded
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("public-api");
  });

  it("should get repos for workload id", async () => {
    const workloadId = "athena";
    const repoGroups = ["frontend"];
    const result = await getReposForWorkloadId(repoGroups, workloadId);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("web");
  });

  it("should exclude matching repos", async () => {
    const workloadId = "athena";
    const repoGroups = ["backend"];
    const result = await getReposForWorkloadId(repoGroups, workloadId);

    // the 'public-api' repo should be excluded
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("public-api");
  });

  it("should get empty repo array for non-existent repo group", async () => {
    const workloadId = "athena";
    const repoGroups = ["no-such-group"];
    const result = await getReposForWorkloadId(repoGroups, workloadId);
    expect(result).toHaveLength(0);
  });

  it("should get code analysis keys for workload id", async () => {
    const workloadId = "athena";
    const repoGroups = ["frontend"];
    const result = await getCodeAnalysisKeysForWorkloadId(repoGroups, workloadId);
    expect(result).toEqual([{ key: "web", repoName: "web" }]);
  });

  it("should get empty code analysis key array for non-existent repo group", async () => {
    const workloadId = "athena";
    const repoGroups = ["non-existent-group"];
    const result = await getCodeAnalysisKeysForWorkloadId(repoGroups, workloadId);
    expect(result).toHaveLength(0);
  });

  it("should return repo group for repo based on pattern", async () => {
    const workloadId = "athena";
    const result = lookupRepoGroupForRepoName(workloadId, "example-match-api");
    expect(result).toBe("backend");
  });

  it("should return null repo group for repo not in a group", async () => {
    const workloadId = "athena";
    const result = lookupRepoGroupForRepoName(workloadId, "non-group-repo");
    expect(result).toBeNull();
  });
});
