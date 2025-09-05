import { InMemoryDatastore, testables } from "../../../db/inmem/db";
import { registerDatastore } from "../../../db/factory";
import { getDatastoreStoredQueryService } from "../datastore";
import { QueryComponentType, StoredQueryCollection } from "../../../model/query";
import { expect } from "@jest/globals";

describe("datastore saved query implementation", () => {
  const collection: StoredQueryCollection = {
    id: "test",
    title: "test collection",
    queries: [
      {
        name: "My Team code quality metric summary",
        description: "Retrieve aggregated summaries of My Team repo groups, and My Team FE in particular.",
        component: QueryComponentType.CodeAnalysisMetricSummary,
        props: {
          repoGroups: ["backend"],
        },
      },
    ],
  };

  beforeAll(() => {
    registerDatastore(
      "inmem",
      Promise.resolve,
      (config) => {
        return new InMemoryDatastore(config);
      },
      true,
    );
  });

  beforeEach(() => {
    testables.clearState();
  });

  it("should store a collection", async () => {
    const service = getDatastoreStoredQueryService();
    await service.storeCollection(collection);

    const result = await service.loadCollection("test");
    expect(result.id).toEqual("test");
  });

  it("should list collections", async () => {
    const service = getDatastoreStoredQueryService();
    await service.storeCollection(collection);

    const collections = await service.listCollections();
    expect(collections).toHaveLength(1);
    expect(collections[0].id).toEqual("test");
  });

  it("should delete a collection", async () => {
    const service = getDatastoreStoredQueryService();
    await service.storeCollection(collection);

    await service.deleteCollection("test");

    const collections = await service.listCollections();
    expect(collections).toHaveLength(0);
  });

  it("returns falsy for nonexistent collection", async () => {
    const service = getDatastoreStoredQueryService();

    const collection = await service.loadCollection("nonexistent");
    expect(collection).toBeFalsy();
  });
});
