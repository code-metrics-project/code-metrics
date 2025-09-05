import { InMemoryDatastore, testables } from "../db";
import { DO_NOT_EXPIRE } from "../../api";

const getInMemoryDatastore = () =>
  new InMemoryDatastore({
    storeEnabled: false,
    expiryEnabled: false,
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
