import { FileStoredQueryService, getFileStoredQueryService } from "../file";
import path from "path";
import { expect } from "@jest/globals";
import { QueryComponentType, StoredQueryCollection } from "../../../model/query";
import fs from "fs";
import * as os from "os";

describe("a file-based stored query service", () => {
  const service = getFileStoredQueryService() as FileStoredQueryService;

  it("returns falsy for nonexistent collection", async () => {
    service.overrideDirs([path.join(__dirname, "test-data")]);

    const collection = await service.loadCollection("nonexistent");
    expect(collection).toBeFalsy();
  });

  it("reads queries from a file", async () => {
    service.overrideDirs([path.join(__dirname, "test-data")]);

    const collection = await service.loadCollection("test");
    const queries = collection.queries;
    expect(queries).toHaveLength(3);
    expect(queries[0].name).toBe("My Team code quality metric summary");
    expect(queries[0].component).toBe("code-analysis-metric-summary");
    expect(queries[0].props).toEqual({
      repoGroups: ["backend", "frontend"],
      individualRepos: ["athena:fe-component-a", "athena:fe-component-b"],
    });
  });

  it("writes queries to a file", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "queries"));
    service.overrideDirs([tempDir]);

    const collection: StoredQueryCollection = {
      id: "test",
      title: "test",
      queries: [
        {
          name: "My Team Sonar metric summary",
          component: QueryComponentType.CodeAnalysisMetricSummary,
          props: {
            repoGroups: ["backend", "frontend"],
            individualRepos: ["athena:fe-component-a", "athena:fe-component-b"],
          },
        },
      ],
    };
    await service.storeCollection(collection);

    const loadedCollection = await service.loadCollection("test");
    expect(loadedCollection.queries).toHaveLength(1);
  });

  it("fetches collection names", async () => {
    service.overrideDirs([path.join(__dirname, "test-data")]);

    const collections = await service.listCollections();
    expect(collections).toHaveLength(1);
    expect(collections[0].id).toEqual("my-team-query-collection");
    expect(collections[0].title).toEqual("My Team query collection");
  });
});
