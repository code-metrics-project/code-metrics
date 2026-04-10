import { InMemoryDatastore, inMemoryAdmin, testables } from "../db";
import { DO_NOT_EXPIRE } from "../../api";

const getInMemoryDatastore = () =>
  new InMemoryDatastore({
    storeEnabled: false,
    expiryEnabled: false,
    autoCreate: true,
    implName: "inmem",
    expireAfterSeconds: 0,
    ttlIfToday: DO_NOT_EXPIRE,
  });

describe("InMemDB", () => {
  beforeEach(() => {
    testables.clearState();
  });

  it("should be able to add and retrieve an item", async () => {
    const db = getInMemoryDatastore();
    const item = { name: "test", data: "foo" };
    await db.connect("test", async (col) => {
      await col.insertOne({ name: "test" }, item);
      const result = await col.findOne({ name: "test" });
      expect(result).toEqual(item);
    });
  });

  it("should be able to delete an item", async () => {
    const db = getInMemoryDatastore();
    const item = { name: "test", data: "foo" };
    await db.connect("test", async (col) => {
      await col.insertOne({ name: "test" }, item);
      await col.deleteOne({ name: "test" });
      const items = await col.listItems();
      expect(items).toEqual([]);
    });
  });

  it("should be able to list items", async () => {
    const db = getInMemoryDatastore();
    const item = { name: "test", data: "foo" };
    await db.connect("test", async (col) => {
      await col.insertOne({ name: "test" }, item);
      const items = await col.listItems();
      expect(items).toEqual([item]);
    });
  });

  it("should be able to delete all items", async () => {
    const db = getInMemoryDatastore();
    const item = { name: "test", data: "foo" };
    await db.connect("test", async (col) => {
      await col.insertOne({ name: "test" }, item);
      await col.deleteAll();
    });

    await db.deleteAll("test");
    await db.connect("test", async (col) => {
      const items = await col.listItems();
      expect(items).toEqual([]);
    });
  });
});

describe("InMemoryAdmin", () => {
  beforeEach(() => {
    testables.clearState();
  });

  it("should list no collections when store is empty", async () => {
    const result = await inMemoryAdmin.listCollections();
    expect(result).toEqual([]);
  });

  it("should list collections after data is inserted", async () => {
    const db = getInMemoryDatastore();
    await db.connect("alpha", async (col) => {
      await col.insertOne({ key: "a" }, { value: 1 });
    });
    await db.connect("beta", async (col) => {
      await col.insertOne({ key: "b" }, { value: 2 });
    });

    const result = await inMemoryAdmin.listCollections();
    expect(result.sort()).toEqual(["alpha", "beta"]);
  });

  it("should report collection existence correctly", async () => {
    const db = getInMemoryDatastore();
    await db.connect("exists", async (col) => {
      await col.insertOne({ key: "a" }, { value: 1 });
    });

    expect(await inMemoryAdmin.collectionExists("exists")).toBe(true);
    expect(await inMemoryAdmin.collectionExists("nope")).toBe(false);
  });

  it("should count items in a collection", async () => {
    const db = getInMemoryDatastore();
    await db.connect("counted", async (col) => {
      await col.insertOne({ key: "a" }, { value: 1 });
      await col.insertOne({ key: "b" }, { value: 2 });
      await col.insertOne({ key: "c" }, { value: 3 });
    });

    const count = await inMemoryAdmin.countItems("counted");
    expect(count).toBe(3);
  });

  it("should return 0 for count on non-existent collection", async () => {
    const count = await inMemoryAdmin.countItems("nonexistent");
    expect(count).toBe(0);
  });

  it("should empty a collection", async () => {
    const db = getInMemoryDatastore();
    await db.connect("toempty", async (col) => {
      await col.insertOne({ key: "a" }, { value: 1 });
      await col.insertOne({ key: "b" }, { value: 2 });
    });

    await inMemoryAdmin.emptyCollection("toempty");

    const count = await inMemoryAdmin.countItems("toempty");
    expect(count).toBe(0);
    // Collection should still exist in the store
    expect(await inMemoryAdmin.collectionExists("toempty")).toBe(true);
  });

  it("should not throw when emptying a non-existent collection", async () => {
    await expect(inMemoryAdmin.emptyCollection("nonexistent")).resolves.toBeUndefined();
  });
});
